// Headless end-to-end check against a running server. Drives real clients
// over the wire, so it exercises the same paths a browser would.
//
//   npm run smoke   (server must already be running)
import { Client } from "colyseus.js";
import { CHARACTERS, PETS, TUNING, VISITOR_PAIRS } from "../../shared/gameData";
import { CHARACTER_SLOTS, JOB_SITES, rectCenter, slotFor } from "../../shared/world";

const ENDPOINT = "ws://localhost:2567";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function charOf(room: any, characterId: string) {
  return room.state.characters.get(characterId);
}

// Gifts arrive on their own schedule and can land mid-assertion, so money
// checks subtract whatever a grandparent handed over during the window.
const gifts: any[] = [];
function giftedTo(characterId: string, sinceIndex: number) {
  return gifts
    .slice(sinceIndex)
    .filter((g) => g.characterId === characterId)
    .reduce((sum, g) => sum + g.amount, 0);
}

// Walk a controlled character to a world point by steering each frame.
async function walkTo(room: any, characterId: string, tx: number, ty: number, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const c = charOf(room, characterId);
    const dx = tx - c.x;
    const dy = ty - c.y;
    if (Math.hypot(dx, dy) < 10) break;
    room.send("move", {
      left: dx < -4,
      right: dx > 4,
      up: dy < -4,
      down: dy > 4,
    });
    await sleep(40);
  }
  room.send("move", { left: false, right: false, up: false, down: false });
  await sleep(120);
}

async function main() {
  console.log("\nSo Many Dogs! — headless smoke test\n");

  // Always run against a brand-new room. joinOrCreate would drop us into
  // whatever room is already open — including one left over from a previous
  // session — which makes results depend on unrelated state.
  const clientA = new Client(ENDPOINT);
  const roomA = await clientA.create("so-many-dogs");
  // Subscribe immediately — a gift can land well before the checks that
  // assert on it, and an unregistered message type is dropped.
  roomA.onMessage("gift", (msg: any) => gifts.push(msg));
  await sleep(400);

  const clientB = new Client(ENDPOINT);
  const roomB = await clientB.joinById(roomA.roomId);
  roomB.onMessage("gift", () => {}); // silence "not registered" noise
  const rejections: any[] = [];
  roomB.onMessage("selectionRejected", (msg: any) => rejections.push(msg));
  await sleep(600);

  // --- character selection -------------------------------------------------
  console.log("Character selection");
  check("joining claims nobody", roomA.state.characters.size > 0 && ![...CHARACTER_SLOTS].some((s) => charOf(roomA, s.characterId).controlledBy !== ""));

  roomA.send("selectCharacter", { characterId: "jason" });
  await sleep(500);
  check("player A got the character they picked", charOf(roomA, "jason").controlledBy === roomA.sessionId);

  // B wants the same one — the server has to refuse and say so.
  roomB.send("selectCharacter", { characterId: "jason" });
  await sleep(500);
  check("a taken character is refused", rejections.length === 1 && rejections[0].characterId === "jason", JSON.stringify(rejections));
  check("the refusal did not steal the character", charOf(roomA, "jason").controlledBy === roomA.sessionId);

  roomB.send("selectCharacter", { characterId: "jane" });
  await sleep(500);
  check("player B got a different character", charOf(roomA, "jane").controlledBy === roomB.sessionId);

  // --- roster ------------------------------------------------------------
  const rosterSize = CHARACTER_SLOTS.length;
  console.log("Roster");
  check(`all ${rosterSize} characters exist`, roomA.state.characters.size === rosterSize, `got ${roomA.state.characters.size}`);

  let controlled = 0;
  let npcs = 0;
  roomA.state.characters.forEach((c: any) => (c.controlledBy === "" ? npcs++ : controlled++));
  check(`2 controlled + ${rosterSize - 2} NPCs`, controlled === 2 && npcs === rosterSize - 2, `controlled=${controlled} npcs=${npcs}`);

  const everyPetPlaced = CHARACTER_SLOTS.every((s) => !!PETS[s.petId]);
  check("every character has a real pet assigned", everyPetPlaced);
  const species = new Set(CHARACTER_SLOTS.map((s) => PETS[s.petId].species));
  check("roster includes dogs, cats and a guinea pig", species.has("dog") && species.has("cat") && species.has("guineaPig"), [...species].join(","));

  const everyCareerHasSite = CHARACTER_SLOTS.every((s) =>
    JOB_SITES.some((j) => j.career === CHARACTERS[s.characterId].career)
  );
  check("every character's career has a job site", everyCareerHasSite);

  const idA = [...CHARACTER_SLOTS].find((s) => charOf(roomA, s.characterId).controlledBy === roomA.sessionId)!.characterId;
  const idB = [...CHARACTER_SLOTS].find((s) => charOf(roomA, s.characterId).controlledBy === roomB.sessionId)!.characterId;
  check("two clients got different characters", idA !== idB, `${idA} / ${idB}`);
  console.log(`        client A = ${CHARACTERS[idA].name}, client B = ${CHARACTERS[idB].name}`);

  // --- NPC idling ---------------------------------------------------------
  console.log("\nNPC behaviour");
  const npcId = CHARACTER_SLOTS.map((s) => s.characterId).find(
    (id) => charOf(roomA, id).controlledBy === ""
  )!;
  const npcStart = { x: charOf(roomA, npcId).x, y: charOf(roomA, npcId).y };
  let sawActivity = false;
  // Must span a whole walk-then-pause cycle. An NPC can idle for up to
  // npcPauseMax (9s) before moving at all, so a shorter window can catch it
  // standing still for the entire sample and wrongly report it never wanders.
  const npcWatchMs = TUNING.npcPauseMaxMs + 16_000;
  for (let i = 0; i < npcWatchMs / 300; i++) {
    await sleep(300);
    if (charOf(roomA, npcId).activity) sawActivity = true;
  }
  const npcEnd = { x: charOf(roomA, npcId).x, y: charOf(roomA, npcId).y };
  const npcMoved = Math.hypot(npcEnd.x - npcStart.x, npcEnd.y - npcStart.y) > 20;
  check("unclaimed character wanders", npcMoved, `moved ${Math.round(Math.hypot(npcEnd.x - npcStart.x, npcEnd.y - npcStart.y))}px`);
  check("unclaimed character shows its annoying trait", sawActivity, `expected "${CHARACTERS[npcId].annoyingTrait}"`);

  // --- work: own career pays double --------------------------------------
  console.log("\nWork & career bonus");
  const ownSite = JOB_SITES.find((s) => s.career === CHARACTERS[idA].career)!;
  const ownCenter = rectCenter(ownSite.rect);
  await walkTo(roomA, idA, ownCenter.x, ownCenter.y);

  let money = charOf(roomA, idA).money;
  let giftMark = gifts.length;
  if (charOf(roomA, idA).derailed) {
    console.log("        (skipped: character was derailed by their annoying trait)");
  } else {
    roomA.send("work");
    await sleep(TUNING.jobShiftDurationMs + 900);
    // A grandparent can hand out cash mid-shift, so back that out to isolate
    // what the job itself actually paid.
    const gained = charOf(roomA, idA).money - money - giftedTo(idA, giftMark);
    check(
      `own career pays 2x at ${ownSite.label}`,
      gained === TUNING.jobBasePay * TUNING.careerMatchMultiplier,
      `gained ${gained}`
    );
  }

  // --- work: someone else's job pays base ---------------------------------
  const otherSite = JOB_SITES.find((s) => s.career !== CHARACTERS[idA].career)!;
  const otherCenter = rectCenter(otherSite.rect);
  await walkTo(roomA, idA, otherCenter.x, otherCenter.y);

  money = charOf(roomA, idA).money;
  giftMark = gifts.length;
  if (charOf(roomA, idA).derailed) {
    console.log("        (skipped: character was derailed by their annoying trait)");
  } else {
    roomA.send("work");
    await sleep(TUNING.jobShiftDurationMs + 900);
    const gained = charOf(roomA, idA).money - money - giftedTo(idA, giftMark);
    check(`mismatched career pays base at ${otherSite.label}`, gained === TUNING.jobBasePay, `gained ${gained}`);
  }

  // --- pet care ------------------------------------------------------------
  console.log("\nPet care");
  const home = slotFor(idA).homeZone;
  const homeCenter = rectCenter(home);
  await walkTo(roomA, idA, homeCenter.x, homeCenter.y);

  const before = { ...charOf(roomA, idA).toJSON() } as any;
  if (charOf(roomA, idA).derailed) {
    console.log("        (skipped: character was derailed by their annoying trait)");
  } else {
    roomA.send("care", { action: "feed" });
    await sleep(250);
    check("feed raises hunger and costs money", charOf(roomA, idA).hunger > before.hunger && charOf(roomA, idA).money === before.money - TUNING.feedCost);

    const beforeWalk = charOf(roomA, idA).bladder;
    roomA.send("care", { action: "walk" });
    await sleep(250);
    check("walk raises bladder", charOf(roomA, idA).bladder > beforeWalk);

    const beforePlay = charOf(roomA, idA).happiness;
    roomA.send("care", { action: "play" });
    await sleep(250);
    check("play raises happiness", charOf(roomA, idA).happiness > beforePlay);
  }

  // --- care is position-gated ---------------------------------------------
  await walkTo(roomA, idA, homeCenter.x, home.y - 90); // step out of the yard
  const outsideHunger = charOf(roomA, idA).hunger;
  roomA.send("care", { action: "feed" });
  await sleep(300);
  check("cannot feed from outside the yard", charOf(roomA, idA).hunger <= outsideHunger);

  // --- visiting grandparents ----------------------------------------------
  console.log("\nVisiting grandparents");
  check(
    "both pairs exist in state",
    roomA.state.visitors.size === VISITOR_PAIRS.length * 2,
    `got ${roomA.state.visitors.size}`
  );
  check("visitors are not claimable characters", !CHARACTER_SLOTS.some((s) => roomA.state.visitors.has(s.characterId)));

  // Snapshot balances, then wait for a *fresh* gift so the before/after
  // comparison can't be confused by one that landed earlier in the run.
  const giftsSoFar = gifts.length;
  const balances = new Map<string, number>([
    [idA, charOf(roomA, idA).money],
    [idB, charOf(roomA, idB).money],
  ]);

  let sawActive = false;
  let pairTogether = true;
  // Must outlast a full cycle: a pair can be away for up to visitorHiddenMax
  // (90s) and then takes another ~11s to hand anything over. A 60s window
  // could legitimately catch neither, which made this check flaky.
  const maxWaitMs = TUNING.visitorHiddenMaxMs + TUNING.visitorFirstGiftMaxMs + 20_000;
  for (let i = 0; i < maxWaitMs / 500; i++) {
    await sleep(500);
    for (const pair of VISITOR_PAIRS) {
      const leader = roomA.state.visitors.get(pair.leaderId)!;
      const follower = roomA.state.visitors.get(pair.followerId)!;
      if (!leader.active) continue;
      sawActive = true;
      // follower should stay tucked in behind the leader
      if (Math.hypot(leader.x - follower.x, leader.y - follower.y) > pair.trailDistance * 3) pairTogether = false;
    }
    if (gifts.length > giftsSoFar) break;
  }

  check("a pair turns up in town", sawActive);
  check("the pair travels together", pairTogether);
  check("a gift was handed out", gifts.length > giftsSoFar, `got ${gifts.length - giftsSoFar}`);
  if (gifts.length > giftsSoFar) {
    const gift = gifts[giftsSoFar];
    console.log(`        ${gift.pairLabel} gave ${gift.characterName} $${gift.amount.toLocaleString()}`);
    check("gift went to a player-controlled character", [idA, idB].includes(gift.characterId), gift.characterId);
    check(
      "gift amount is within the tuned range",
      gift.amount >= TUNING.visitorGiftMin && gift.amount <= TUNING.visitorGiftMax,
      String(gift.amount)
    );
    const before = balances.get(gift.characterId)!;
    const after = charOf(roomA, gift.characterId).money;
    check("recipient's money went up by the gift", after >= before + gift.amount, `${before} -> ${after}`);
  }

  // --- disconnect reverts the character to an NPC -------------------------
  console.log("\nDisconnect");
  await roomB.leave(true);
  await sleep(700);
  check("leaving frees the character back to NPC", charOf(roomA, idB).controlledBy === "");
  check(`roster still shows all ${rosterSize} after a leave`, roomA.state.characters.size === rosterSize);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  await roomA.leave(true);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke test crashed:", err);
  process.exit(1);
});
