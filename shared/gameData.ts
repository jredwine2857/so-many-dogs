// Single source of truth for character/pet/tuning data, imported by both
// client and server so they can never disagree about what a job pays or
// how fast a pet's meters decay.

export type HairStyle = "buzz" | "short" | "long" | "wavy" | "ponytail" | "bun";
export type Accessory = "none" | "tutu" | "beltGi" | "headband" | "tie" | "scarf";

export interface Appearance {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  top: number;
  bottom: number;
  shoes: number;
  accessory: Accessory;
  child: boolean;
}

export interface CharacterDef {
  id: string;
  name: string;
  career: string;
  annoyingTrait: string;
  petId: string;
  accent: number;
  // Set explicitly per the gender given for each character in the brief —
  // used for the "X can't move because <pronoun> is …" freeze announcement.
  pronoun: "he" | "she" | "they";
  appearance: Appearance;
}

export type PetSize = "small" | "medium" | "large";
export type PetSpecies = "dog" | "cat" | "guineaPig";

export interface PetDef {
  id: string;
  name: string;
  species: PetSpecies;
  size: PetSize;
  coat: number;
  fluffy: boolean;
  floppyEars: boolean;
  // Quirk multipliers, straight from GAME_DESIGN.md §5.
  hungerDecayMultiplier: number;
  bladderDecayMultiplier: number;
  energyDecayMultiplier: number;
  happinessVolatility: number;
}

// Careers double as the 2x-bonus match key — a character earns double only
// at a job site whose `career` string equals theirs exactly.
export const CAREERS = {
  it: "Computers / IT",
  fashion: "Fashion & Retail",
  pharma: "Pharmaceutical Sales",
  medical: "Medical",
  church: "Church & Ministry",
  realEstate: "Real Estate",
  makeup: "Makeup Artistry",
  music: "Music & Piano",
  karate: "Karate & MMA",
  ballet: "Ballet",
  finance: "Finance",
  maintenance: "Building Maintenance",
  machinery: "Heavy Machinery",
} as const;

export const CHARACTERS: Record<string, CharacterDef> = {
  jason: {
    id: "jason",
    name: "Jason",
    career: CAREERS.it,
    annoyingTrait: "sleeping",
    petId: "pebble",
    accent: 0x5b9bff,
    pronoun: "he",
    appearance: { skin: 0xe8b48c, hair: 0x3a2a1c, hairStyle: "short", top: 0x2f6fd0, bottom: 0x2c3550, shoes: 0x1e2433, accessory: "none", child: false },
  },
  jane: {
    id: "jane",
    name: "Jane",
    career: CAREERS.fashion,
    annoyingTrait: "chewing really loud",
    petId: "lexi",
    accent: 0xffb347,
    pronoun: "she",
    appearance: { skin: 0xf0c9a4, hair: 0xe8c66a, hairStyle: "long", top: 0xff8fb1, bottom: 0x6b4b8a, shoes: 0xd94f8c, accessory: "scarf", child: false },
  },
  kayli: {
    id: "kayli",
    name: "Kayli",
    career: CAREERS.pharma,
    annoyingTrait: "yelling",
    petId: "bella",
    accent: 0xd94f8c,
    pronoun: "she",
    appearance: { skin: 0xecc0a0, hair: 0x4a2f21, hairStyle: "wavy", top: 0xe0577f, bottom: 0x2f3242, shoes: 0x8a2f4a, accessory: "none", child: false },
  },
  jonathan: {
    id: "jonathan",
    name: "Jonathan",
    career: CAREERS.it,
    annoyingTrait: "sleeping",
    petId: "ice",
    accent: 0xd94a3d,
    pronoun: "he",
    appearance: { skin: 0xdda57c, hair: 0x25201c, hairStyle: "buzz", top: 0xc0392b, bottom: 0x39424f, shoes: 0x22262e, accessory: "none", child: false },
  },
  payton: {
    id: "payton",
    name: "Payton",
    career: CAREERS.medical,
    annoyingTrait: "busy working out",
    petId: "maggie",
    accent: 0x3fbf87,
    pronoun: "she",
    appearance: { skin: 0xd9a074, hair: 0x2e1f17, hairStyle: "ponytail", top: 0x2fbf87, bottom: 0x2c3550, shoes: 0xf2f6fb, accessory: "headband", child: false },
  },
  brooklin: {
    id: "brooklin",
    name: "Brooklin",
    career: CAREERS.church,
    annoyingTrait: "sucking on her toe",
    petId: "charlie",
    accent: 0xa07bd6,
    pronoun: "she",
    appearance: { skin: 0xf0c9a4, hair: 0x6b4326, hairStyle: "wavy", top: 0x9b6fd4, bottom: 0x4a3d6b, shoes: 0x6b4b8a, accessory: "none", child: false },
  },
  kelli: {
    id: "kelli",
    name: "Kelli",
    career: CAREERS.realEstate,
    annoyingTrait: "yelling at anyone who is nearby",
    petId: "asher",
    accent: 0x2fb5c4,
    pronoun: "she",
    appearance: { skin: 0xecc0a0, hair: 0xc9a227, hairStyle: "short", top: 0x2fa8b8, bottom: 0x33384a, shoes: 0x22303a, accessory: "none", child: false },
  },
  grace: {
    id: "grace",
    name: "Grace",
    career: CAREERS.makeup,
    annoyingTrait: "making TikTok videos",
    petId: "teddy",
    accent: 0xff6fae,
    pronoun: "she",
    appearance: { skin: 0xe8b48c, hair: 0x1f1a17, hairStyle: "long", top: 0xff6fae, bottom: 0x2b2b3a, shoes: 0xff9ec9, accessory: "none", child: false },
  },
  tomas: {
    id: "tomas",
    name: "Tomas",
    career: CAREERS.music,
    annoyingTrait: "singing",
    petId: "sandy",
    accent: 0xe0c060,
    pronoun: "he",
    appearance: { skin: 0xc98a5e, hair: 0x1a1512, hairStyle: "short", top: 0x1f2430, bottom: 0x2a2f3c, shoes: 0x14181f, accessory: "tie", child: false },
  },
  junior: {
    id: "junior",
    name: "Junior",
    career: CAREERS.karate,
    annoyingTrait: "begging for ice cream",
    petId: "chop",
    accent: 0xf0f2f5,
    pronoun: "he",
    appearance: { skin: 0xdda57c, hair: 0x241c15, hairStyle: "buzz", top: 0xf2f4f8, bottom: 0xf2f4f8, shoes: 0x2b3140, accessory: "beltGi", child: true },
  },
  isla: {
    id: "isla",
    name: "Isla",
    career: CAREERS.ballet,
    annoyingTrait: "begging for ice cream",
    petId: "summer",
    accent: 0xffc2dd,
    pronoun: "she",
    appearance: { skin: 0xf0c9a4, hair: 0x8a5a2b, hairStyle: "bun", top: 0xffc2dd, bottom: 0xff9ec9, shoes: 0xffd9e8, accessory: "tutu", child: true },
  },
  ambria: {
    id: "ambria",
    name: "Ambria",
    career: CAREERS.finance,
    annoyingTrait: "working at the Dairy Bar",
    petId: "bynx",
    accent: 0x4fc4a8,
    pronoun: "she",
    appearance: { skin: 0xd9a074, hair: 0x2b1d14, hairStyle: "long", top: 0x2f8f7a, bottom: 0x2c3550, shoes: 0x1e2a33, accessory: "none", child: false },
  },
  michael: {
    id: "michael",
    name: "Michael",
    career: CAREERS.maintenance,
    annoyingTrait: "playing video games",
    petId: "meowmeow",
    accent: 0xd98c3f,
    pronoun: "he",
    appearance: { skin: 0xe8b48c, hair: 0x4a3524, hairStyle: "short", top: 0xd98c3f, bottom: 0x3f4654, shoes: 0x2b2118, accessory: "none", child: false },
  },
  jordyn: {
    id: "jordyn",
    name: "Jordyn",
    career: CAREERS.machinery,
    annoyingTrait: "getting drunk",
    petId: "chip",
    accent: 0xe8b13f,
    pronoun: "she",
    appearance: { skin: 0xecc0a0, hair: 0x6b4326, hairStyle: "ponytail", top: 0xe8b13f, bottom: 0x4a4a52, shoes: 0x3a2f28, accessory: "headband", child: false },
  },
};

// Roster order — also the order joining clients claim characters in.
export const CHARACTER_ORDER = [
  "jason", "jane", "kayli", "jonathan", "payton", "brooklin",
  "kelli", "grace", "tomas", "junior", "isla",
  "ambria", "michael", "jordyn",
];

export const PETS: Record<string, PetDef> = {
  pebble:   { id: "pebble",   name: "Pebble",     species: "dog",       size: "small",  coat: 0x9c6b3f, fluffy: false, floppyEars: true,  hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.0, energyDecayMultiplier: 1.0, happinessVolatility: 0 },
  bella:    { id: "bella",    name: "Bella",      species: "dog",       size: "small",  coat: 0xd8c9b0, fluffy: false, floppyEars: true,  hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.8, energyDecayMultiplier: 1.1, happinessVolatility: 3 },
  teddy:    { id: "teddy",    name: "Teddy",      species: "dog",       size: "small",  coat: 0xb5814a, fluffy: true,  floppyEars: true,  hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.7, energyDecayMultiplier: 0.6, happinessVolatility: 0 },
  charlie:  { id: "charlie",  name: "Charlie",    species: "dog",       size: "small",  coat: 0xe2c58c, fluffy: true,  floppyEars: true,  hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.2, energyDecayMultiplier: 1.6, happinessVolatility: 1 },
  lexi:     { id: "lexi",     name: "Lexi",       species: "dog",       size: "small",  coat: 0x6b4a33, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.1, energyDecayMultiplier: 1.7, happinessVolatility: 1 },
  maggie:   { id: "maggie",   name: "Maggie",     species: "dog",       size: "large",  coat: 0xc48a4a, fluffy: false, floppyEars: true,  hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 0.9, energyDecayMultiplier: 1.3, happinessVolatility: 0 },
  summer:   { id: "summer",   name: "Summer",     species: "dog",       size: "large",  coat: 0x8a6440, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.0, energyDecayMultiplier: 1.6, happinessVolatility: 2 },
  sandy:    { id: "sandy",    name: "Sandy",      species: "dog",       size: "small",  coat: 0xe8d29a, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.0, energyDecayMultiplier: 1.2, happinessVolatility: 0 },
  chop:     { id: "chop",     name: "Chop",       species: "dog",       size: "large",  coat: 0x4a4038, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.0, energyDecayMultiplier: 1.7, happinessVolatility: 1 },
  ice:      { id: "ice",      name: "Ice",        species: "dog",       size: "large",  coat: 0xe6ebf2, fluffy: true,  floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 0.9, energyDecayMultiplier: 0.7, happinessVolatility: 0 },
  asher:    { id: "asher",    name: "Asher",      species: "dog",       size: "small",  coat: 0x3a3630, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 1.3, energyDecayMultiplier: 1.9, happinessVolatility: 4 },

  // Cats and a guinea pig — same four meters, different pressure points.
  // Bynx burns energy chasing mice; Meow Meow's seizures make happiness
  // lurch unpredictably; Chip's catatonic spells mean he stops eating and
  // drinking, so hunger and bladder both run hot.
  bynx:     { id: "bynx",     name: "Bynx",       species: "cat",       size: "medium", coat: 0x5a5f6b, fluffy: false, floppyEars: false, hungerDecayMultiplier: 1.2, bladderDecayMultiplier: 0.8, energyDecayMultiplier: 1.8, happinessVolatility: 1 },
  meowmeow: { id: "meowmeow", name: "Meow Meow",  species: "cat",       size: "small",  coat: 0xf0e6d2, fluffy: true,  floppyEars: false, hungerDecayMultiplier: 1.0, bladderDecayMultiplier: 0.9, energyDecayMultiplier: 1.0, happinessVolatility: 6 },
  chip:     { id: "chip",     name: "Chip",       species: "guineaPig", size: "small",  coat: 0xc98a5e, fluffy: true,  floppyEars: false, hungerDecayMultiplier: 2.0, bladderDecayMultiplier: 1.5, energyDecayMultiplier: 0.5, happinessVolatility: 2 },
};

// Grandparents. They aren't playable — no home, no pet, no job, and they
// can't be claimed on join. They turn up in town every so often, travel as a
// pair, hand money to a random player, and drift off again. Because that is,
// after all, what grandparents do.
export type VisitorKind = "ghost" | "walker" | "wheelchair";

export interface VisitorPersonDef {
  id: string;
  name: string;
  kind: VisitorKind;
  tint: number;
  scale: number;
  accessory: "bun" | "glasses" | "none";
  appearance?: Appearance; // only used by the "walker" kind
}

export interface VisitorPairDef {
  id: string;
  label: string;
  emoji: string;
  leaderId: string;
  followerId: string;
  trailDistance: number;
}

export const VISITOR_PEOPLE: Record<string, VisitorPersonDef> = {
  momo: { id: "momo", name: "Momo", kind: "ghost", tint: 0xffe3ef, scale: 0.92, accessory: "bun" },
  bobo: { id: "bobo", name: "Bobo", kind: "ghost", tint: 0xdfeaff, scale: 1.06, accessory: "glasses" },
  judi: { id: "judi", name: "Judi", kind: "wheelchair", tint: 0xb98fd6, scale: 1, accessory: "bun" },
  john: {
    id: "john",
    name: "John",
    kind: "walker",
    tint: 0x6b8fb5,
    scale: 1,
    accessory: "glasses",
    appearance: { skin: 0xe8b48c, hair: 0xd8d8dc, hairStyle: "short", top: 0x6b8fb5, bottom: 0x4a4f57, shoes: 0x2b2f38, accessory: "none", child: false },
  },
};

// The leader sets the course; the follower trails behind. For John & Judi
// that ordering is the whole point — Judi rides in front and John pushes,
// so he stays behind her whichever way they turn.
export const VISITOR_PAIRS: VisitorPairDef[] = [
  { id: "momobobo", label: "Momo & Bobo", emoji: "👻", leaderId: "momo", followerId: "bobo", trailDistance: 54 },
  { id: "johnjudi", label: "John & Judi", emoji: "👵", leaderId: "judi", followerId: "john", trailDistance: 27 },
];

export const TUNING = {
  winTargetMoney: 1_000_000,
  moveSpeed: 260, // px/sec
  npcMoveSpeed: 70,

  jobShiftDurationMs: 3000,
  jobBasePay: 75_000,
  careerMatchMultiplier: 2, // permanent-passive, confirmed in GAME_DESIGN.md §4

  feedCost: 5,
  feedHungerGain: 30,
  walkBladderGain: 25,
  walkEnergyGain: 15,
  playHappinessGain: 25,
  playEnergyGain: 10,

  meterMax: 100,
  hungerDecayPerSec: 0.5,
  bladderDecayPerSec: 0.4,
  energyDecayPerSec: 0.3,
  happinessBaseDecayPerSec: 0.2,
  happinessCriticalPenaltyPerSec: 1,
  criticalThreshold: 25,

  petDeathGraceMs: 15_000,

  // "Annoying trait" derail: periodically the character does their own
  // thing and the player loses control entirely for a full minute, while
  // meters keep decaying regardless.
  annoyingDerailDurationMs: 60_000,
  annoyingCooldownMinMs: 60_000,
  annoyingCooldownMaxMs: 180_000,

  // Unclaimed characters idle around town doing their annoying trait.
  npcPauseMinMs: 3_000,
  npcPauseMaxMs: 9_000,

  // Visiting grandparents. Gifts are sized well under a shift's base pay so
  // they're a fun swing rather than the main way anyone gets rich — very
  // much a first guess at balance, tune after a playtest.
  visitorSpeed: 62,
  visitorFirstAppearMinMs: 4_000,
  visitorFirstAppearMaxMs: 12_000,
  visitorHiddenMinMs: 45_000,
  visitorHiddenMaxMs: 90_000,
  visitorVisitMinMs: 30_000,
  visitorVisitMaxMs: 50_000,
  visitorFirstGiftMinMs: 4_000,
  visitorFirstGiftMaxMs: 11_000,
  visitorGiftMinMs: 12_000,
  visitorGiftMaxMs: 25_000,
  visitorGiftMin: 8_000,
  visitorGiftMax: 45_000,
} as const;
