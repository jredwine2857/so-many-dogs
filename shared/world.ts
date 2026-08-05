import { CAREERS, CHARACTERS, CHARACTER_ORDER } from "./gameData";

export type MeterKey = "hunger" | "bladder" | "energy" | "happiness";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectContains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function rectCenter(rect: Rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// Framework-agnostic layout (no Phaser types — the plain-Node server
// imports this too). The client turns these rects into drawn buildings.
export const WORLD = { width: 2500, height: 1320 };

// Main street running across the middle of town, separating the commercial
// district (north) from the residential blocks (south).
export const STREET: Rect = { x: 0, y: 560, width: WORLD.width, height: 200 };

// Where unclaimed characters idle around — keeps NPC foot traffic on the
// street instead of wandering through the middle of buildings.
export const WALK_AREA: Rect = { x: 80, y: 590, width: WORLD.width - 160, height: 140 };

export type BuildingStyle =
  | "office" | "hospital" | "church" | "realty" | "boutique"
  | "pharma" | "salon" | "concert" | "dojo" | "ballet"
  | "bank" | "workshop" | "machineyard" | "dairybar";

export interface JobSite {
  career: string;
  label: string;
  icon: string;
  style: BuildingStyle;
  rect: Rect;
}

const JOB_W = 290;
const JOB_H = 200;
const ROW_A_Y = 70;
const ROW_B_Y = 320;
const JOB_X = [40, 370, 700, 1030, 1360, 1690, 2020];

export const JOB_SITES: JobSite[] = [
  { career: CAREERS.it,          label: "Northgate Data Center", icon: "💻", style: "office",      rect: { x: JOB_X[0], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.medical,     label: "County Hospital",       icon: "🏥", style: "hospital",    rect: { x: JOB_X[1], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.church,      label: "Grace Chapel",          icon: "⛪", style: "church",      rect: { x: JOB_X[2], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.realEstate,  label: "Keystone Realty",       icon: "🏠", style: "realty",      rect: { x: JOB_X[3], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.fashion,     label: "Marigold Boutique",     icon: "👗", style: "boutique",    rect: { x: JOB_X[4], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.finance,     label: "Meridian Financial",    icon: "💰", style: "bank",        rect: { x: JOB_X[5], y: ROW_A_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.maintenance, label: "Citywide Facilities",   icon: "🔧", style: "workshop",    rect: { x: JOB_X[6], y: ROW_A_Y, width: JOB_W, height: JOB_H } },

  { career: CAREERS.pharma,      label: "Vantage Pharma",        icon: "💊", style: "pharma",      rect: { x: JOB_X[0], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.makeup,      label: "Glow Studio",           icon: "💄", style: "salon",       rect: { x: JOB_X[1], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.music,       label: "Riverside Hall",        icon: "🎹", style: "concert",     rect: { x: JOB_X[2], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.karate,      label: "Iron Path Dojo",        icon: "🥋", style: "dojo",        rect: { x: JOB_X[3], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.ballet,      label: "Swan Academy",          icon: "🩰", style: "ballet",      rect: { x: JOB_X[4], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
  { career: CAREERS.machinery,   label: "Redline Equipment Yard", icon: "🚜", style: "machineyard", rect: { x: JOB_X[5], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
];

// Not a job — a landmark, because Ambria's annoying trait is bailing on
// whatever she's doing to go work at the Dairy Bar.
export const SCENERY: JobSite[] = [
  { career: "", label: "The Dairy Bar", icon: "🍦", style: "dairybar", rect: { x: JOB_X[6], y: ROW_B_Y, width: JOB_W, height: JOB_H } },
];

export interface CharacterSlot {
  characterId: string;
  petId: string;
  homeZone: Rect; // stand in the yard to care for your pet
  spawn: { x: number; y: number };
}

const HOME_W = 235;
const HOME_H = 175;
const HOME_ROW_A_Y = 790;
const HOME_ROW_B_Y = 1010;
const HOME_X = [40, 305, 570, 835, 1100, 1365, 1630];

function homeRect(index: number): Rect {
  const inRowA = index < HOME_X.length;
  const x = HOME_X[inRowA ? index : index - HOME_X.length];
  const y = inRowA ? HOME_ROW_A_Y : HOME_ROW_B_Y;
  return { x, y, width: HOME_W, height: HOME_H };
}

// Every character always exists in the world — claimed ones are driven by a
// player, the rest idle as NPCs (GAME_DESIGN.md §2/§3).
export const CHARACTER_SLOTS: CharacterSlot[] = CHARACTER_ORDER.map((characterId, index) => {
  const zone = homeRect(index);
  return {
    characterId,
    petId: CHARACTERS[characterId].petId,
    homeZone: zone,
    spawn: { x: zone.x + zone.width / 2, y: zone.y + zone.height + 34 },
  };
});

export function slotFor(characterId: string): CharacterSlot {
  return CHARACTER_SLOTS.find((s) => s.characterId === characterId)!;
}
