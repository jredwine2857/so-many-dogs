import { Schema, MapSchema, type } from "@colyseus/schema";

// One entry per character in the roster — always all of them, whether a
// player has claimed them or not. `controlledBy` is the session id of the
// player driving this character, or "" when they're an idle NPC.
export class CharacterState extends Schema {
  @type("string") characterId = "";
  @type("string") petId = "";
  @type("string") controlledBy = "";

  @type("number") x = 0;
  @type("number") y = 0;

  @type("number") money = 50;
  @type("number") hunger = 80;
  @type("number") bladder = 80;
  @type("number") energy = 80;
  @type("number") happiness = 80;

  @type("boolean") working = false;
  @type("number") workProgress = 0; // 0..1

  @type("boolean") derailed = false;
  @type("number") derailRemainingMs = 0;

  // What an unclaimed character is currently up to — their annoying trait,
  // shown as a little emote bubble. Empty while they're just walking.
  @type("string") activity = "";

  @type("boolean") eliminated = false;
  @type("string") eliminationReason = "";
}

// Visiting grandparents. Position and presence only — no stats, no pet, and
// they can't be claimed by a player.
export class VisitorState extends Schema {
  @type("string") visitorId = "";
  @type("string") pairId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("boolean") active = false;
}

export class RoomState extends Schema {
  @type({ map: CharacterState }) characters = new MapSchema<CharacterState>();
  @type({ map: VisitorState }) visitors = new MapSchema<VisitorState>();
  @type("boolean") gameOver = false;
  @type("string") endTitle = "";
  @type("string") endMessage = "";
}
