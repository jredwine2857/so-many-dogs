# Infrastructure

OpenTofu + GitHub Actions. Everything in AWS is created from this directory —
nothing is clicked together in the console.

## What gets built

```
                    ┌──────────── CloudFront (client) ──── S3 bucket (private, OAC)
   browser ─────────┤                                       built Vite bundle
   (https)          │
                    └──────────── CloudFront (game) ─────── EC2 t3.micro
                       wss://                                Docker container
                                                             Colyseus :2567
```

Two CloudFront distributions, and the second one deserves an explanation.

The client is served over HTTPS, and **a browser refuses to open a plaintext
`ws://` socket from an `https://` page**. So the game socket has to be
`wss://`, which needs a TLS certificate — and a certificate needs a domain
name, which this project deliberately doesn't have (it's a shared link for
friends, not a product). Putting CloudFront in front of the EC2 instance
solves it: CloudFront terminates TLS with its own `*.cloudfront.net`
certificate, proxies WebSockets natively, and talks to the instance over
plain HTTP inside AWS.

That has a second benefit — the instance's security group only accepts
traffic from CloudFront's published origin IP ranges, so the game server
isn't reachable directly from the internet at all. There is **no SSH port
open**; shell access and deploys both go through SSM.

The trade-off is one extra network hop per message. Immaterial for a
life-sim ticking at 20Hz; it would matter for a twitch shooter.

## Cost

On a new account this should sit in or near the free tier: `t3.micro` is
free for 750 h/month for the first 12 months, CloudFront's free tier covers
1 TB egress/month, and S3/ECR usage here is pennies. The Elastic IP is free
**while attached to a running instance** — if you stop the instance and
leave the IP allocated, AWS charges for it.

Nothing here autoscales and nothing runs on a schedule, so the bill should
be flat and boring. Set a billing alarm anyway.

## First-time setup

You need to do these once, in order. Steps 1–3 can't be automated — they
need your credentials and your approval.

### 1. AWS account

Create an AWS account if you don't have one, then create an IAM user or
Identity Center user for yourself with admin access and configure the CLI:

```bash
aws configure
```

Bootstrap needs real admin credentials because it creates IAM roles.

### 2. Bootstrap (once, locally)

This creates the S3 bucket for OpenTofu state and the IAM role that GitHub
Actions will assume. It has to run locally because CI can't create the very
credentials it needs to run.

```bash
cd infra/bootstrap
tofu init
tofu apply -var="github_owner=YOUR_GITHUB_USERNAME"
```

It prints the three values you need next. Keep `terraform.tfstate` in this
directory — it's gitignored and must not be committed.

### 3. Point the repo at AWS

In the GitHub repo: **Settings → Secrets and variables → Actions →
Variables**, add the three values the bootstrap printed:

| Variable | Value |
|---|---|
| `TF_STATE_BUCKET` | the `state_bucket` output |
| `AWS_ROLE_ARN` | the `ci_role_arn` output |
| `AWS_REGION` | `us-east-2` |

These are **variables, not secrets** — none are sensitive. The role can only
be assumed by a token issued to this specific repo.

Then create an Environment named `production` (**Settings → Environments**)
and add yourself as a required reviewer. This is what makes every apply and
deploy pause for your approval instead of changing live infrastructure the
moment something lands on `main`.

### 4. First deploy

```bash
gh workflow run "Infra apply"
```

Approve it when it pauses. When it finishes, run the game deploy:

```bash
gh workflow run "Deploy game"
```

The play URL is in the workflow summary.

## Day-to-day

- **Change infrastructure** — open a PR touching `infra/`. `Infra plan`
  comments the full plan on the PR. Merging to `main` runs `Infra apply`,
  which waits for your approval.
- **Change the game** — merge to `main`. `Deploy game` builds the server
  image, ships it via SSM, rebuilds the client, syncs it to S3 and
  invalidates the CDN.
- **Get a shell on the box** — `aws ssm start-session --target <instance-id>`.
  No SSH key, no open port.

## Tearing it down

```bash
tofu -chdir=infra destroy
```

The state bucket in `infra/bootstrap` has `prevent_destroy` set, so it
survives on purpose — deleting it would orphan any infrastructure still
running. Remove it by hand when you're truly finished.
