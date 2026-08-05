# So Many Dogs! — Game Design Doc (v0.2)

Browser-based multiplayer life-sim. 1–13 players share an open world, each
controlling one character who is chasing a fortune while keeping an
adopted pet alive. First player to $1,000,000 wins; any player whose pet
dies is immediately eliminated.

This doc defines rules and content. It intentionally does NOT lock in
every number (income rates, decay rates, etc.) — those get tuned once
there's a playable prototype. Anywhere a number appears below, treat it
as a starting guess, not a spec.

---

## 1. Win / Lose Conditions

- **Win:** first player to reach $1,000,000 net worth. Game ends immediately,
  that player is declared winner to the whole room.
- **Lose (elimination):** if a player's pet dies, that player is out.
  Their character and pet leave the world; remaining players continue.
- **Last-caretaker-standing win:** if every other player's pet dies, the
  one remaining player with a living pet wins outright — they don't need
  to hit $1,000,000 first. So there are two independent win conditions:
  reach $1M, or simply be the last player left with a living pet.

Pet death should never feel like a surprise ambush — it should always be
preceded by visible, escalating warning states (see §5) so it reads as
"you ignored this" rather than "the game cheated you."

## 2. Players & Session

- Up to 14 human players per world instance ("room") — one per character —
  browser only, no install. (The original brief said 1–13; the roster is now
  14, and the cap simply tracks the roster size.)
- Each player takes one character from the roster (§3) at the start of a
  session.
- **The entire cast and every job site are always present, regardless of
  headcount.** Characters nobody is playing stroll around town as NPCs,
  periodically stopping to do the annoying thing they're known for (§3a) —
  so a 2-player session still looks like a populated town, and the world
  doesn't visibly change shape based on who showed up. Claiming a character
  turns them from NPC to player-controlled; disconnecting hands them back.
  (This supersedes an earlier rule where unpicked characters didn't appear
  at all and only Kelli roamed.)
- NPCs are set dressing only: their pets don't decay and they can't win or
  be eliminated. Win/lose is strictly among human players.
- Every player is **forced to adopt a pet** at game start — no skipping.
  Each character comes paired with their own pet (§5).
- World is persistent and shared for the life of the session (one game =
  one continuous open world, not level-based).
- Sessions are ephemeral for MVP: no cross-session save/resume. (Persistent
  accounts/progression is a Phase 2+ idea, see architecture doc.)

## 3. Characters & Careers

Every adult character has one canonical **career** — the job they're
"known for." If a player chooses the career that matches their character's
known trade, that's their **preferred career**, and it triggers the star
moment (§4). Anyone can technically work any open job in the world, but
only the character's own matching career gives the 2x bonus.

| Character | Type | Known for / Career | Personality hook (flavor + gameplay nudge) |
|---|---|---|---|
| Jason | Adult, M | Computers / IT | Travels a lot, works out a lot, handsome, funny — good candidate for a "charisma" perk (faster social/networking tasks) |
| Jane | Adult, F | Fashion / Retail (open to renaming) | Never sleeps, tons of energy, chews loud — can work night-shift jobs other characters can't |
| Kayli | Adult, F | Pharmaceutical Sales | Very bougie — spends more on lifestyle/pet upkeep by default, higher income ceiling |
| Jonathan | Adult, M | Computers / IT | Loves fast/loud classic cars — car-related side hustle or collectible flavor |
| Payton | Adult, F | Medical | Very athletic, works out a lot — stamina perk, maybe faster movement/energy regen |
| Brooklin | Adult, F | Church / Ministry | Funny, partier, churchgoer — community/social bonus, maybe discounts at social venues |
| Kelli | Adult, F | Real Estate | Drives a Cadillac Escalade. **Confirmed pure flavor, zero gameplay effect:** the "gets angry ~1 week/month" trait is cosmetic only (a bark of dialogue/animation, no debuff). Her yelling-at-passers-by gag is now just her entry in the annoying-trait table (§3a) — every character does their own version of this, so she's no longer special-cased. |
| Grace | Adult, F | Makeup Artist | Beauty/appearance flavor, could unlock cosmetic customization for other characters |
| Tomas | Adult, M | Musician (piano) | Literal source of the "career match" music/star moment flavor — his bonus could visibly play piano stings |
| Junior | Child, M | Karate / MMA | Kids don't have adult jobs — earns money via **tournaments/competitions** instead of a career (see below) |
| Isla | Child, F | Ballet / "Princess" | Same — earns via **recitals/performances** instead of a career |
| Ambria | Adult, F | Finance | Works at Meridian Financial |
| Michael | Adult, M | Building Maintenance | Works at Citywide Facilities |
| Jordyn | Adult, F | Heavy Machinery | Operates equipment at the Redline Equipment Yard |

### 3a. Annoying Traits

Every character has one **annoying trait** — the thing they do when nobody
has active control of them. It shows up in two places:

1. **As an NPC**, whenever no player has claimed that character: they roam
   town and periodically stop to do it, with an emote bubble. Pure ambience,
   no mechanical effect on anyone.
2. **As a derail**, for player-controlled characters: at randomized
   intervals the trait takes over and the player **loses all control for a
   full 60 seconds** — no movement, no working, no pet care. An in-progress
   work shift is cancelled with no partial pay. Meters keep decaying the
   whole time, so a badly-timed derail is a genuine threat to the pet.

| Character | Annoying trait |
|---|---|
| Jason | sleeping |
| Jane | chewing really loud |
| Kayli | yelling |
| Jonathan | sleeping |
| Payton | busy working out |
| Brooklin | sucking on her toe |
| Kelli | yelling at anyone who is nearby |
| Grace | making TikTok videos |
| Tomas | singing |
| Junior | begging for ice cream |
| Isla | begging for ice cream |
| Ambria | working at the Dairy Bar (there's a Dairy Bar in town for exactly this reason) |
| Michael | playing video games |
| Jordyn | getting drunk |

**Each trait has its own sound**, synthesized in-browser (no audio files):
snoring, wet chewing, yelling, workout grunts, a slurp, a TikTok jingle,
sung notes, a kid's whine, an ice-cream-truck melody, 8-bit game blips, and
a hiccup. Sounds are positional — volume falls off with distance and pans
left/right — capped at 6 at once, and re-trigger on a per-character
randomized timer so the town babbles rather than pulsing in unison. `M`
mutes; browsers require one click/keypress before any audio can start.

**Freezing is announced to everyone.** When a *player-controlled* character
derails, every client shows a toast: *"Jason can't move because he is
sleeping."* NPCs doing their trait are not announced — they're always at it,
so it would be constant noise.

### 3b. Visiting Grandparents

Two pairs of grandparents drift through town. They are **not playable** —
no home, no pet, no job, and a joining player can never be assigned one.
They exist to hand out money, because that is what grandparents do.

| Pair | Who | How they travel |
|---|---|---|
| Momo & Bobo | Two ghosts | Float together, Bobo trailing Momo. Translucent, bobbing; walls don't stop them |
| John & Judi | John pushes Judi in her wheelchair | Judi leads and John follows close behind, so he's always pushing whichever way they turn |

**Visit cycle:** each pair is absent most of the time, then walks in from
one end of the street, mills around town for ~30–50s handing out money,
and leaves. Then they're gone for ~45–90s before the next visit. The two
pairs are staggered so they don't always arrive together, and the first
visit lands within the opening seconds of a match so players see them early.

**Gifting:** while visiting, a pair picks one random player — never an NPC,
never an eliminated player — and adds a windfall to their balance. Everyone
sees a notice: *"👻 Momo & Bobo slipped Jason $23,400."*

Gift sizes are deliberately well under a single shift's base pay: they're a
fun random swing, not a viable way to reach $1,000,000. That balance is a
first guess and should be revisited after a real playtest — if gifts start
deciding who wins, they're too big.

**Kids are not small adults.** Junior and Isla shouldn't clock into office
jobs. Proposed alternate income loop for children:
- Scheduled events (a tournament for Junior, a recital for Isla) that pay
  out on completion, roughly analogous to a work shift for adults.
- Their "preferred career" star-moment equivalent = winning their
  competition, which should feel like a bigger, rarer payoff than an
  adult's daily shift bonus, not a smaller one.
- They still adopt and must care for a pet like everyone else — no
  exception for children in the elimination rule, per the brief ("every
  person is forced to adopt a pet").

## 4. The "Star Moment" (2x Money) Mechanic

- When a player sends their character to work **their character's own
  known career**, trigger a distinct celebration: music sting, a star
  icon appears over the character with a "2x MONEY" label, and all
  earnings from that work session are doubled.
- Working a *mismatched* job (not their known career) still pays, just
  at the normal rate, no star.
- **Confirmed: permanent passive.** Once a character is working their
  known career, every shift at that job pays 2x, indefinitely — no
  cooldown, no first-shift-only limitation.

## 5. Pet Care System

Every pet needs ongoing care from its caretaker (the player who adopted
it). Proposed meters, all decaying over time and restored by player
actions:

- **Hunger** — feed the pet; ignored too long → starts costing Happiness,
  eventually fatal.
- **Bladder / Cleanliness** — walk or let the pet out; ignored → "accident"
  in the house (mess to clean, Happiness hit, no direct death risk but
  compounds other meters).
- **Energy / Exercise** — play/walk; high-energy pets punish neglect
  faster than lazy ones.
- **Happiness** — a rollup meter fed by the others plus pet-specific
  quirks (see table). Sustained zero Happiness is what actually kills a
  pet — this is the meter that should visibly trend toward "critical"
  over multiple check-ins, never a single missed action, so death always
  feels earned rather than sudden.

Each pet's quirks change how these meters behave, straight from the
brief's descriptions. Each character comes paired with one pet, so all 11
pets are always in the world (in their owner's yard):

| Owner | Pet |
|---|---|
| Jason | Pebble |
| Jane | Lexi |
| Kayli | Bella |
| Jonathan | Ice |
| Payton | Maggie |
| Brooklin | Charlie |
| Kelli | Asher |
| Grace | Teddy |
| Tomas | Sandy |
| Junior | Chop |
| Isla | Summer |
| Ambria | Bynx |
| Michael | Meow Meow |
| Jordyn | Chip |

| Pet | Size | Quirk → mechanical effect |
|---|---|---|
| Teddy | Small | Lazy — low Energy requirement, but Bladder decays fast ("tends to pee in the house") |
| Bella | Very small | Neurotic — Happiness is twitchy/volatile, also fast Bladder decay |
| Charlie | Small | Energetic puppy — high Energy requirement; generates a recurring "mess" (shedding) chore separate from Bladder |
| Lexi | Small | High energy + jumps super high — high Energy requirement; may "escape" if a fence/yard isn't secured (flavor risk event) |
| Maggie | Large | Loves fetch — Energy need is satisfied efficiently by a dedicated fetch mini-interaction, big Happiness payoff per play session |
| Summer | Big | High energy + jealous of Sandy — if Sandy is in the same household and gets attention Summer doesn't, Summer's Happiness takes an extra hit (relationship-coupled pets are a stretch goal, not MVP) |
| Sandy | Small | Likes treats + runs in circles — treats are a fast Happiness top-up but should cost money and maybe a small long-term downside (weight/health) so it's not a free win |
| Chop | Big | High energy, jumps on people — satisfying Energy is high priority; unmet Energy risks a "knocked something over" mishap |
| Pebble | Small | Wiener dog, no strong quirk called out — plays as the "baseline" pet, useful as the balancing reference |
| Ice | Big, fluffy | Slow, smart, doesn't listen — low Energy need, but commands/actions have a chance to just not register, adding friction even for an attentive owner |
| Asher | Small | "Worst dog ever" — bites, never stops moving — hardest pet to keep happy; also a liability, could randomly nip another player's character for a minor debuff. This should be the pet advanced/joke-loving players pick on purpose, not one that's punishing by accident. |
| Bynx | Cat, medium | Loves chasing mice — burns Energy fastest of any pet (1.8x), but self-entertains, so Bladder is easygoing |
| Meow Meow | Cat, small | Has seizures — by far the most volatile Happiness (swings ±6/sec); can lurch toward critical with no warning, so needs checking on more often than her other meters suggest |
| Chip | Guinea pig, small | Goes catatonic and stops eating/drinking — Hunger drains at 2x and Bladder at 1.5x, making him the most feeding-intensive pet; very low Energy needs to compensate |

Elimination trigger: **any** meter (per final design, likely Happiness as
the rollup) hitting zero and staying there for a defined grace period
kills the pet and eliminates that player.

## 6. Core Loop (per player, running concurrently in the shared world)

1. Move around the shared open world (2D top-down).
2. Go to your character's job site → work a shift → earn money (2x if
   it's your known career, §4).
3. Go home / to pet → perform care actions to keep meters up (§5).
4. Spend money — on pet upkeep (food, vet, toys), personal stuff, maybe
   optional flex/status purchases (fits Kelli's Escalade, Kayli's bougie
   trait, etc. — a light money-sink so hoarding isn't the only viable
   strategy).
5. Repeat until someone hits $1,000,000 (win) or a pet dies (that
   player's elimination).

Because it's shared real-time multiplayer, there's a natural tension
between "go earn money" and "go tend your pet" that plays out live in
front of (and possibly overlapping with) other players in the same
world — that overlap is most of what makes the "open world" framing
worth the multiplayer complexity, so early prototyping should test
whether players actually run into each other in a fun way.

## 7. Economy Notes

- Needs at least one money sink beyond pet care (cosmetic purchases,
  housing upgrades, faster pet-care tools) or the mid-game turns into
  pure number-stacking with no decisions.
- Kayli ("bougie") and Kelli (Escalade) suggest some characters could
  have higher baseline expenses in exchange for higher income ceilings —
  worth playtesting rather than deciding up front.

## 8. Status

No open design questions left blocking the prototype. Resolved: 2x
career bonus is permanent-passive; last remaining caretaker with a
living pet wins outright even under $1M; title is **So Many Dogs!**;
unpicked characters don't appear except Kelli, who roams as a
flavor-only NPC yelling at players until someone picks her; Kelli's
anger trait (picked or not) has zero mechanical effect, ever.

## 9. Suggested Build Order (once you sign off on this doc)

1. **Prototype (local, single machine, one browser tab):** core loop for
   one character + one pet — move, work, earn, feed/walk/play, meters
   decay, star moment, win/lose conditions. No networking yet.
2. **Add a second local pet/character** to prove the "shared world,
   multiple caretakers" tension is actually fun before investing in
   networking.
3. **Multiplayer:** wire up the real-time layer (see ARCHITECTURE.md) and
   move from local-only to a hosted AWS room for 1–13 players.
4. **Full roster + polish:** all 11 characters, all 11 pets, visuals,
   audio for the star moment, mishap/event flavor.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the technical plan.
