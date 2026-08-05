# So Many Dogs! — Technical Architecture (v0.2)

Companion to [GAME_DESIGN.md](GAME_DESIGN.md). Covers how the game runs
in a browser, how multiplayer state is synced, and how it's hosted on
AWS for 1–13 concurrent players. Nothing here is poured in concrete —
it's a starting recommendation sized to the actual scale of this game
(a handful of players, not thousands), so we don't over-build.

---

## 1. Client (browser)

- **Rendering:** 2D top-down, HTML5 Canvas via **Phaser 3**. Good fit
  for a tile-based open world, sprite animation, and it has a large
  community + AWS-agnostic (it's just a static JS bundle).
- **No native install** — runs in any modern browser, per the brief.
- Client is "dumb" for multiplayer purposes: it renders state it's told
  about and sends player intents (move, work, feed pet, etc.) to the
  server. It should not be the source of truth for anything that affects
  win/lose (money, pet health) — that has to live server-side so one
  player's browser can't just edit their own bank balance.

## 2. Real-time multiplayer layer

Recommendation: **Colyseus** (Node.js authoritative multiplayer
framework) over a hand-rolled WebSocket protocol.

Why Colyseus specifically:
- Built-in **room** concept maps directly onto "one shared open-world
  session for up to N players" — a room *is* a game session.
- Authoritative server state with automatic state-diff sync to clients
  — solves "don't trust the client" for money/pet-health for free.
- Native browser client SDK, no build-your-own-protocol work.
- At 1–13 players, this is comfortably within a single small server
  process — no need for its clustering/Redis features at this scale,
  which keeps the AWS footprint simple.

Alternative if you'd rather not take on a framework: raw `ws` (Node
WebSocket library) with a manual authoritative game loop. More control,
more code to write and maintain. Only worth it if Colyseus's opinions
end up fighting the design.

## 3. Server-authoritative rules of thumb

- Server owns: player money, pet meters, elimination/win checks, career
  bonus calculation.
- Client sends: intents ("I want to move here," "I want to work my
  shift," "I want to feed my pet"). Server validates and applies.
- Server broadcasts: authoritative world state deltas to all clients in
  the room, at a modest tick rate (this isn't a twitch shooter — even
  5–10 updates/sec is plenty for a life-sim).

## 4. Persistence

- **MVP:** none needed beyond the life of a session — a game is one
  continuous sitting from adopt-a-pet to someone hitting $1M. Room state
  lives in server memory.
- **Phase 2+ (only if you want games to span multiple sittings or want
  player accounts/stats):** DynamoDB is the natural fit — single-table,
  cheap at this scale, low ops overhead. Not needed for MVP; call this
  out explicitly so we don't build it prematurely.

## 5. AWS hosting

Given the actual scale (1 room, ≤13 players, casual life-sim tick rate),
two viable tiers:

### Tier A — MVP / cheapest (recommended to start)
- **One small EC2 instance** (confirmed — see rationale in §6) running
  the Node/Colyseus server. It serves the WebSocket connections
  directly.
- **Static client bundle** (Phaser build) served from **S3 + CloudFront**,
  or even just served by the same Node process for absolute simplicity
  during prototyping.
- **No domain needed** — confirmed this is a shared-link/IP setup for
  you + friends, not a public product. An **Elastic IP** on the EC2
  instance is still worth allocating via OpenTofu so the address stays
  stable across instance stop/start (otherwise a plain public IP changes
  on every restart, which would break the shared link each time).
- **Security group**: open only the WebSocket port + HTTP(S), nothing
  else — notably, **no inbound SSH port needed** if deploys go through
  SSM (see §7), which shrinks the attack surface to just the two ports
  the game actually needs.
- Rough cost at this scale: low tens of dollars/month or less, likely
  free-tier eligible for early testing depending on instance size.

### Tier B — if it grows beyond a single friend-group session
- Move the Node server into **ECS Fargate** behind an **Application
  Load Balancer** (ALB supports WebSocket passthrough) for
  auto-restart/health-check resilience.
- Multiple simultaneous rooms would need Colyseus's presence/matchmaking
  backed by **ElastiCache Redis** so rooms can be discovered across
  server instances.
- Not recommended to build this on day one — it solves a scaling
  problem this game doesn't have yet at 1–13 players in a single shared
  world.

**Recommendation: build and playtest on Tier A.** Only move to Tier B if
you outgrow a single EC2/Lightsail instance, which is unlikely at this
player count.

**Stack confirmed:** no language/framework preference stated, so we're
going with Phaser 3 + Node/Colyseus as recommended above. AWS account is
starting fresh — nothing pre-existing to work around.

## 6. Infrastructure as Code — OpenTofu

All AWS resources get defined in OpenTofu, no click-ops. Since the
account is starting fresh, IaC is the *first* thing that exists, before
any manual resource creation — there's nothing to import/reconcile later.

- **State backend:** S3 bucket for state + native S3 state locking (or a
  DynamoDB lock table if the OpenTofu version in use doesn't yet support
  native S3 locking) — both are cheap, standard, and created once, by
  hand or via a tiny bootstrap config, before the rest of the stack
  exists to depend on them.
- **Root module scope (Tier A, per §5):**
  - VPC (or deliberately reuse the account's default VPC to start —
    worth a call once we're actually writing the config, no need to
    over-build networking for one instance)
  - Security group(s) — WebSocket port + HTTP(S) only, no SSH ingress
  - **EC2 instance — confirmed over Lightsail.** Lightsail's flatter
    pricing doesn't end up mattering much at this scale, and EC2 wins on
    everything else that's actually load-bearing here: full OpenTofu/AWS
    provider support, and — the deciding factor — clean **SSM (Systems
    Manager)** integration for deploys, which lets a GitHub-hosted
    runner push code to the instance with zero inbound SSH and no
    self-hosted runner to babysit (see §7). Lightsail can technically do
    SSM too but it's a bolt-on, not the native path.
  - Elastic IP, associated to the instance, for a stable shared address
  - IAM instance profile on the EC2 instance with `AmazonSSMManagedInstanceCore`
    so SSM Send-Command can reach it
  - S3 bucket + CloudFront distribution for the static client bundle
  - IAM role for CI to assume (see §7) — least-privilege, scoped to
    only what deploys need to touch (SSM Send-Command against this one
    instance, S3 sync to this one bucket, CloudFront invalidation)
- **Variables/outputs:** instance size, region, domain name (optional),
  etc. as `tfvars`; outputs expose the instance's public DNS / S3 bucket
  name / CloudFront URL for the deploy job to consume.

Nothing here gets `tofu apply`'d without you explicitly signing off —
this creates real, billed AWS resources, so plans get reviewed (via CI,
see below) before anything is applied, same as the safety norm for any
infra change.

## 7. CI/CD — Git-runner pipelines

Two independent pipelines, both triggered from the same repo:

### Infra pipeline (OpenTofu)
- **On PR touching `infra/`:** runner checks out the branch, runs
  `tofu fmt -check`, `tofu validate`, and `tofu plan`, then posts the
  plan output to the PR for review. Nothing is applied yet.
- **On merge to `main`:** runner runs `tofu apply` against the reviewed
  plan. This step should require an explicit approval gate (a GitHub
  Environment with required reviewers is the standard way) since it's
  changing real infrastructure/cost.
- **AWS credentials for the runner:** recommend OIDC federation
  (GitHub's OIDC provider → an AWS IAM role via `sts:AssumeRoleWithWebIdentity`)
  rather than long-lived AWS access keys stored as secrets — no
  credentials to leak or rotate, and it's the current AWS-recommended
  pattern for GitHub Actions.

### Game deploy pipeline (client + server code)
- **On PR:** typecheck/lint/test the client and server packages.
- **On merge to `main`:** build the Phaser client bundle, sync it to the
  S3 bucket (invalidate CloudFront), then deploy the server.

**Deploy mechanism — recommending GitHub-hosted runner + AWS SSM
Send-Command, not a self-hosted runner on the EC2 box.** You'd guessed
the EC2 deploy would need a self-hosted runner living on that instance;
worth flagging that it doesn't, and why a GitHub-hosted runner is the
better default here:
- SSM Send-Command lets a GitHub-hosted runner (authenticated via the
  OIDC-assumed IAM role from §6) tell the EC2 instance "pull latest,
  restart the process" without any inbound port open to it at all — no
  SSH, no runner registration token, no long-lived agent process
  competing with the game server for the instance's modest CPU/RAM.
- A self-hosted runner *on the game server itself* means anything that
  can trigger your GitHub Actions workflow effectively gets a foothold
  on the box the whole game runs on — a bigger security surface for not
  much benefit at this scale, and one more process to keep alive and
  patch.
- Self-hosted only earns its keep if a job needs something a
  GitHub-hosted runner structurally can't do (private-network-only
  resources, specialized hardware, etc.) — not the case here.

So: **GitHub-hosted runners everywhere**, including the EC2 deploy step,
via SSM. Flag if you'd still rather run a self-hosted runner on the
instance for some other reason (e.g., wanting direct control/debugging
access baked into CI) — it's a reasonable choice, just not the default
here.

Both pipelines target a **new GitHub repo, separate from
c7infrastructure**, as confirmed.

## 8. Suggested repo layout (once we start building)

```
so-many-dogs/
  client/         # Phaser app (static bundle)
  server/         # Colyseus rooms, authoritative game logic
  shared/         # types/constants shared by client & server (character
                   # roster, pet roster, career table, meter constants)
  infra/          # OpenTofu root module(s): main.tf, variables.tf,
                   # outputs.tf, backend.tf
  .github/
    workflows/     # infra-plan.yml, infra-apply.yml, deploy-game.yml
  GAME_DESIGN.md
  ARCHITECTURE.md
```

Keeping character/pet/career data in a single `shared/` source of truth
avoids the client and server ever disagreeing about e.g. what Jane's
career is or what Asher's bite-risk is.

## 9. Status

No open infrastructure questions left blocking the prototype. Resolved:
shared link/IP, no domain; new standalone GitHub repo; GitHub-hosted
runners throughout, deploying to EC2 via SSM rather than a self-hosted
runner; EC2 (not Lightsail) as the compute target. One thing to confirm
if you disagree: the self-hosted-runner alternative flagged in §7 — say
so if you'd rather go that route instead.
