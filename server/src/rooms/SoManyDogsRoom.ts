import { Room, Client } from "colyseus";
import { RoomState, CharacterState, VisitorState } from "../schema/GameState";
import { CHARACTERS, CHARACTER_ORDER, PETS, TUNING, VISITOR_PAIRS } from "../../../shared/gameData";
import { CHARACTER_SLOTS, JOB_SITES, STREET, WALK_AREA, WORLD, rectContains, slotFor } from "../../../shared/world";

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const TICK_MS = 50; // 20Hz — plenty for a life-sim, per ARCHITECTURE.md

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Authoritative simulation. Clients only ever send intents ("move", "work",
// "care") — every outcome (money, meters, elimination, win) is decided here
// and synced out via the schema, so a client can't edit its own bank balance
// or pet health directly.
export class SoManyDogsRoom extends Room<RoomState> {
  maxClients = CHARACTER_SLOTS.length;

  private inputs = new Map<string, InputState>(); // by characterId
  private workStartedAt = new Map<string, number>();
  private derailedUntil = new Map<string, number>();
  private nextDerailAt = new Map<string, number>();
  private happinessZeroSince = new Map<string, number>();

  private characterOf = new Map<string, string>(); // sessionId -> characterId
  private npcTarget = new Map<string, { x: number; y: number }>();
  private npcPauseUntil = new Map<string, number>();

  private visitState = new Map<
    string,
    { target: { x: number; y: number }; appearAt: number; leaveAt: number; giftAt: number }
  >();

  onCreate() {
    this.setState(new RoomState());

    // Every character exists from the moment the room does — players claim
    // them on join, and the rest idle around town as NPCs.
    CHARACTER_ORDER.forEach((characterId) => {
      const slot = slotFor(characterId);
      const character = new CharacterState();
      character.characterId = characterId;
      character.petId = slot.petId;
      character.x = slot.spawn.x;
      character.y = slot.spawn.y;
      this.state.characters.set(characterId, character);
      this.pickNpcTarget(characterId, 0);
    });

    VISITOR_PAIRS.forEach((pair, i) => {
      [pair.leaderId, pair.followerId].forEach((visitorId) => {
        const visitor = new VisitorState();
        visitor.visitorId = visitorId;
        visitor.pairId = pair.id;
        visitor.x = -200;
        visitor.y = STREET.y + STREET.height / 2;
        visitor.active = false;
        this.state.visitors.set(visitorId, visitor);
      });
      // Stagger the pairs so they don't always turn up together.
      this.visitState.set(pair.id, {
        target: { x: WORLD.width / 2, y: STREET.y + STREET.height / 2 },
        appearAt: randomBetween(TUNING.visitorFirstAppearMinMs, TUNING.visitorFirstAppearMaxMs) + i * 9_000,
        leaveAt: 0,
        giftAt: 0,
      });
    });

    this.onMessage("move", (client, input: Partial<InputState>) => {
      const characterId = this.characterOf.get(client.sessionId);
      if (!characterId) return;
      const current = this.inputs.get(characterId) ?? { up: false, down: false, left: false, right: false };
      this.inputs.set(characterId, { ...current, ...input });
    });

    this.onMessage("work", (client) => {
      const characterId = this.characterOf.get(client.sessionId);
      if (characterId) this.tryStartWork(characterId);
    });

    this.onMessage("care", (client, msg: { action?: "feed" | "walk" | "play" }) => {
      const characterId = this.characterOf.get(client.sessionId);
      if (characterId && msg?.action) this.tryCare(characterId, msg.action);
    });

    this.setSimulationInterval((deltaMs) => this.tick(deltaMs), TICK_MS);
  }

  onJoin(client: Client) {
    const characterId = CHARACTER_ORDER.find((id) => this.state.characters.get(id)!.controlledBy === "");
    if (!characterId) {
      client.leave();
      return;
    }

    const character = this.state.characters.get(characterId)!;
    const slot = slotFor(characterId);
    character.controlledBy = client.sessionId;
    character.activity = "";
    character.x = slot.spawn.x;
    character.y = slot.spawn.y;
    character.money = 50;
    character.hunger = 80;
    character.bladder = 80;
    character.energy = 80;
    character.happiness = 80;
    character.working = false;
    character.workProgress = 0;
    character.derailed = false;
    character.derailRemainingMs = 0;
    character.eliminated = false;
    character.eliminationReason = "";

    this.characterOf.set(client.sessionId, characterId);
    this.inputs.set(characterId, { up: false, down: false, left: false, right: false });
    this.scheduleNextDerail(characterId, this.clock.currentTime);
  }

  onLeave(client: Client) {
    const characterId = this.characterOf.get(client.sessionId);
    if (!characterId) return;

    // Character reverts to an idle NPC rather than vanishing — the whole
    // roster stays visible regardless of who's connected.
    const character = this.state.characters.get(characterId);
    if (character) {
      character.controlledBy = "";
      character.working = false;
      character.workProgress = 0;
      character.derailed = false;
      character.derailRemainingMs = 0;
      character.eliminated = false;
      character.eliminationReason = "";
    }

    this.characterOf.delete(client.sessionId);
    this.inputs.delete(characterId);
    this.workStartedAt.delete(characterId);
    this.derailedUntil.delete(characterId);
    this.nextDerailAt.delete(characterId);
    this.happinessZeroSince.delete(characterId);
    this.pickNpcTarget(characterId, this.clock.currentTime);
  }

  // --- Intents -----------------------------------------------------------

  private scheduleNextDerail(characterId: string, fromTime: number) {
    this.nextDerailAt.set(
      characterId,
      fromTime + randomBetween(TUNING.annoyingCooldownMinMs, TUNING.annoyingCooldownMaxMs)
    );
  }

  private isDerailed(characterId: string): boolean {
    return this.derailedUntil.has(characterId);
  }

  private tryStartWork(characterId: string) {
    const character = this.state.characters.get(characterId);
    if (!character || character.eliminated || character.working || this.isDerailed(characterId)) return;
    if (!JOB_SITES.some((s) => rectContains(s.rect, character.x, character.y))) return;
    character.working = true;
    character.workProgress = 0;
    this.workStartedAt.set(characterId, this.clock.currentTime);
  }

  private tryCare(characterId: string, action: "feed" | "walk" | "play") {
    const character = this.state.characters.get(characterId);
    if (!character || character.eliminated || this.isDerailed(characterId)) return;
    const slot = slotFor(characterId);
    if (!rectContains(slot.homeZone, character.x, character.y)) return;

    if (action === "feed") {
      if (character.money < TUNING.feedCost) return;
      character.money -= TUNING.feedCost;
      character.hunger = clamp(character.hunger + TUNING.feedHungerGain, 0, TUNING.meterMax);
    } else if (action === "walk") {
      character.bladder = clamp(character.bladder + TUNING.walkBladderGain, 0, TUNING.meterMax);
      character.energy = clamp(character.energy + TUNING.walkEnergyGain, 0, TUNING.meterMax);
    } else if (action === "play") {
      character.happiness = clamp(character.happiness + TUNING.playHappinessGain, 0, TUNING.meterMax);
      character.energy = clamp(character.energy + TUNING.playEnergyGain, 0, TUNING.meterMax);
    }
  }

  // --- Fixed-tick simulation ----------------------------------------------

  private tick(deltaMs: number) {
    if (this.state.gameOver) return;
    const now = this.clock.currentTime;
    const dt = deltaMs / 1000;

    this.state.characters.forEach((character, characterId) => {
      if (character.controlledBy === "") {
        this.tickNpc(character, characterId, now, deltaMs);
        return;
      }
      if (character.eliminated) return;

      this.updateDerail(characterId, character, now);
      const derailed = this.isDerailed(characterId);

      if (!derailed) {
        this.applyMovement(characterId, character, deltaMs);
        this.updateWork(characterId, character, now);
      } else if (character.working) {
        // No partial credit — getting derailed mid-shift loses it.
        character.working = false;
        character.workProgress = 0;
      }

      this.decayMeters(character, dt);
    });

    this.updateVisitors(now, deltaMs);
    this.checkEndConditions(now);
  }

  // --- Visiting grandparents ---------------------------------------------

  private updateVisitors(now: number, deltaMs: number) {
    VISITOR_PAIRS.forEach((pair) => {
      const visit = this.visitState.get(pair.id)!;
      const leader = this.state.visitors.get(pair.leaderId)!;
      const follower = this.state.visitors.get(pair.followerId)!;

      if (!leader.active) {
        if (now < visit.appearAt) return;
        this.beginVisit(pair.id, now);
        return;
      }

      if (now >= visit.leaveAt) {
        leader.active = false;
        follower.active = false;
        visit.appearAt = now + randomBetween(TUNING.visitorHiddenMinMs, TUNING.visitorHiddenMaxMs);
        return;
      }

      // Leader wanders; follower tucks in behind at a fixed trailing distance.
      const step = (TUNING.visitorSpeed * deltaMs) / 1000;
      const dx = visit.target.x - leader.x;
      const dy = visit.target.y - leader.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        visit.target = this.pickVisitorTarget(leader.x, leader.y);
      } else {
        leader.x += (dx / dist) * step;
        leader.y += (dy / dist) * step;
      }

      const fdx = leader.x - follower.x;
      const fdy = leader.y - follower.y;
      const fdist = Math.hypot(fdx, fdy);
      if (fdist > pair.trailDistance) {
        const catchUp = Math.min(step * 1.15, fdist - pair.trailDistance);
        follower.x += (fdx / fdist) * catchUp;
        follower.y += (fdy / fdist) * catchUp;
      }

      if (now >= visit.giftAt) {
        this.giveGift(pair.id);
        visit.giftAt = now + randomBetween(TUNING.visitorGiftMinMs, TUNING.visitorGiftMaxMs);
      }
    });
  }

  private beginVisit(pairId: string, now: number) {
    const pair = VISITOR_PAIRS.find((p) => p.id === pairId)!;
    const visit = this.visitState.get(pairId)!;
    const leader = this.state.visitors.get(pair.leaderId)!;
    const follower = this.state.visitors.get(pair.followerId)!;

    // Arrive from whichever end of the street, so they walk into town.
    const fromLeft = Math.random() < 0.5;
    const entryX = fromLeft ? 40 : WORLD.width - 40;
    const entryY = randomBetween(WALK_AREA.y, WALK_AREA.y + WALK_AREA.height);

    leader.x = entryX;
    leader.y = entryY;
    follower.x = entryX + (fromLeft ? -pair.trailDistance : pair.trailDistance);
    follower.y = entryY;
    leader.active = true;
    follower.active = true;

    visit.target = this.pickVisitorTarget(leader.x, leader.y);
    visit.leaveAt = now + randomBetween(TUNING.visitorVisitMinMs, TUNING.visitorVisitMaxMs);
    visit.giftAt = now + randomBetween(TUNING.visitorFirstGiftMinMs, TUNING.visitorFirstGiftMaxMs);
  }

  private pickVisitorTarget(fromX: number, fromY: number) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomBetween(180, 460);
    return {
      x: clamp(fromX + Math.cos(angle) * radius, 40, WORLD.width - 40),
      y: clamp(fromY + Math.sin(angle) * radius, WALK_AREA.y, WALK_AREA.y + WALK_AREA.height),
    };
  }

  private giveGift(pairId: string) {
    const pair = VISITOR_PAIRS.find((p) => p.id === pairId)!;
    const eligible: CharacterState[] = [];
    this.state.characters.forEach((c) => {
      if (c.controlledBy !== "" && !c.eliminated) eligible.push(c);
    });
    if (eligible.length === 0) return; // nobody around to spoil

    const lucky = eligible[Math.floor(Math.random() * eligible.length)];
    const amount = Math.round(randomBetween(TUNING.visitorGiftMin, TUNING.visitorGiftMax) / 100) * 100;
    lucky.money += amount;

    this.broadcast("gift", {
      pairId: pair.id,
      pairLabel: pair.label,
      emoji: pair.emoji,
      characterId: lucky.characterId,
      characterName: CHARACTERS[lucky.characterId].name,
      amount,
    });
  }

  // Unclaimed characters stroll the street and periodically stop to do the
  // annoying thing they're known for.
  private tickNpc(character: CharacterState, characterId: string, now: number, deltaMs: number) {
    const pausedUntil = this.npcPauseUntil.get(characterId) ?? 0;
    if (now < pausedUntil) {
      character.activity = CHARACTERS[characterId].annoyingTrait;
      return;
    }

    const target = this.npcTarget.get(characterId);
    if (!target) {
      this.pickNpcTarget(characterId, now);
      return;
    }

    const dx = target.x - character.x;
    const dy = target.y - character.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      this.npcPauseUntil.set(characterId, now + randomBetween(TUNING.npcPauseMinMs, TUNING.npcPauseMaxMs));
      this.pickNpcTarget(characterId, now);
      character.activity = CHARACTERS[characterId].annoyingTrait;
      return;
    }

    const step = (TUNING.npcMoveSpeed * deltaMs) / 1000;
    character.x += (dx / dist) * step;
    character.y += (dy / dist) * step;
    character.activity = "";
  }

  // Wander to somewhere nearby rather than anywhere in town. Across a
  // 2500px map a global target could mean half a minute of uninterrupted
  // walking, so NPCs would rarely stop to do their trait — and they'd all
  // drift toward the middle. Short local hops keep them spread out and
  // performing regularly.
  private pickNpcTarget(characterId: string, _now: number) {
    const character = this.state.characters.get(characterId);
    const originX = character ? character.x : WALK_AREA.x + WALK_AREA.width / 2;
    const originY = character ? character.y : WALK_AREA.y + WALK_AREA.height / 2;

    const angle = Math.random() * Math.PI * 2;
    const radius = randomBetween(120, 380);
    this.npcTarget.set(characterId, {
      x: clamp(originX + Math.cos(angle) * radius, WALK_AREA.x, WALK_AREA.x + WALK_AREA.width),
      y: clamp(originY + Math.sin(angle) * radius, WALK_AREA.y, WALK_AREA.y + WALK_AREA.height),
    });
  }

  private updateDerail(characterId: string, character: CharacterState, now: number) {
    const until = this.derailedUntil.get(characterId);
    if (until !== undefined) {
      if (now >= until) {
        this.derailedUntil.delete(characterId);
        character.derailed = false;
        character.derailRemainingMs = 0;
        character.activity = "";
        this.scheduleNextDerail(characterId, now);
      } else {
        character.derailed = true;
        character.derailRemainingMs = until - now;
        character.activity = CHARACTERS[characterId].annoyingTrait;
      }
      return;
    }
    const nextAt = this.nextDerailAt.get(characterId) ?? now;
    if (now >= nextAt) {
      this.derailedUntil.set(characterId, now + TUNING.annoyingDerailDurationMs);
      character.derailed = true;
      character.derailRemainingMs = TUNING.annoyingDerailDurationMs;
      character.activity = CHARACTERS[characterId].annoyingTrait;
    }
  }

  private applyMovement(characterId: string, character: CharacterState, deltaMs: number) {
    if (character.working) return;
    const input = this.inputs.get(characterId);
    if (!input) return;
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx === 0 && dy === 0) return;

    const len = Math.sqrt(dx * dx + dy * dy);
    const speed = (TUNING.moveSpeed * deltaMs) / 1000;
    character.x = clamp(character.x + (dx / len) * speed, 16, WORLD.width - 16);
    character.y = clamp(character.y + (dy / len) * speed, 16, WORLD.height - 16);
  }

  private updateWork(characterId: string, character: CharacterState, now: number) {
    if (!character.working) return;
    const startedAt = this.workStartedAt.get(characterId) ?? now;
    const elapsed = now - startedAt;
    character.workProgress = clamp(elapsed / TUNING.jobShiftDurationMs, 0, 1);

    if (elapsed >= TUNING.jobShiftDurationMs) {
      const site = JOB_SITES.find((s) => rectContains(s.rect, character.x, character.y));
      const matches = !!site && site.career === CHARACTERS[character.characterId].career;
      character.money += TUNING.jobBasePay * (matches ? TUNING.careerMatchMultiplier : 1);
      character.working = false;
      character.workProgress = 0;
    }
  }

  private decayMeters(character: CharacterState, dt: number) {
    const pet = PETS[character.petId];
    character.hunger = clamp(
      character.hunger - TUNING.hungerDecayPerSec * pet.hungerDecayMultiplier * dt,
      0,
      TUNING.meterMax
    );
    character.bladder = clamp(
      character.bladder - TUNING.bladderDecayPerSec * pet.bladderDecayMultiplier * dt,
      0,
      TUNING.meterMax
    );
    character.energy = clamp(
      character.energy - TUNING.energyDecayPerSec * pet.energyDecayMultiplier * dt,
      0,
      TUNING.meterMax
    );

    let happinessDecay = TUNING.happinessBaseDecayPerSec;
    if (character.hunger < TUNING.criticalThreshold) happinessDecay += TUNING.happinessCriticalPenaltyPerSec;
    if (character.bladder < TUNING.criticalThreshold) happinessDecay += TUNING.happinessCriticalPenaltyPerSec;
    if (character.energy < TUNING.criticalThreshold) happinessDecay += TUNING.happinessCriticalPenaltyPerSec;

    // Volatility only jitters happiness while it's still above rock bottom —
    // otherwise a "neurotic" pet like Bella could get randomly bounced back
    // above 0 forever and become unable to ever die from neglect.
    let happiness = character.happiness - happinessDecay * dt;
    if (happiness > 0 && pet.happinessVolatility > 0) {
      happiness += (Math.random() * 2 - 1) * pet.happinessVolatility * dt;
    }
    character.happiness = clamp(happiness, 0, TUNING.meterMax);
  }

  // Only player-controlled characters can win or be eliminated — idle NPCs
  // are set dressing and their pets aren't at stake.
  private checkEndConditions(now: number) {
    const participants: CharacterState[] = [];
    this.state.characters.forEach((c) => {
      if (c.controlledBy !== "") participants.push(c);
    });
    if (participants.length === 0) return;

    const winner = participants.find((c) => !c.eliminated && c.money >= TUNING.winTargetMoney);
    if (winner) {
      this.endGame(
        `${CHARACTERS[winner.characterId].name} hit $${TUNING.winTargetMoney.toLocaleString()}!`,
        `${PETS[winner.petId].name} is happy and healthy. ${CHARACTERS[winner.characterId].name} wins!`
      );
      return;
    }

    participants.forEach((character) => {
      if (character.eliminated) return;
      const characterId = character.characterId;
      if (character.happiness <= 0) {
        if (!this.happinessZeroSince.has(characterId)) this.happinessZeroSince.set(characterId, now);
        if (now - this.happinessZeroSince.get(characterId)! >= TUNING.petDeathGraceMs) {
          character.eliminated = true;
          character.eliminationReason = `${PETS[character.petId].name} was neglected too long and didn't make it.`;
        }
      } else {
        this.happinessZeroSince.delete(characterId);
      }
    });

    const active = participants.filter((c) => !c.eliminated);
    if (active.length === 0) {
      this.endGame("GAME OVER", "Every pet was lost — no one wins this round.");
    } else if (active.length === 1 && participants.length > 1) {
      const survivor = active[0];
      this.endGame(
        `${CHARACTERS[survivor.characterId].name} is the last caretaker standing!`,
        `${PETS[survivor.petId].name} made it through — that's the win, even under $1,000,000.`
      );
    }
  }

  private endGame(title: string, message: string) {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.endTitle = title;
    this.state.endMessage = message;

    // A finished game is over for good — the tick loop stops, so anyone
    // matched into this room afterwards would land in a world where nothing
    // moves. Lock it out of matchmaking immediately, then tear it down once
    // players have had time to read the result; the next join makes a fresh
    // room.
    this.lock();
    this.clock.setTimeout(() => this.disconnect(), 20_000);
  }
}
