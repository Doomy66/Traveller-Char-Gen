import type { Effect, Source, Stat, TableRow } from "./types";

/**
 * The general tables of Traveller creation, Core Rulebook 2022 pp8-57.
 * Text is ours; numbers are the book's.
 */

const crb = (page: number): Source => ({ book: "CRB", page });

/** Characteristic modifiers, CRB p9. */
export function characteristicDM(score: number): number {
  if (score <= 0) return -3;
  if (score <= 2) return -2;
  if (score <= 5) return -1;
  if (score <= 8) return 0;
  if (score <= 11) return 1;
  if (score <= 14) return 2;
  return 3;
}

export const STAT_NAMES: Record<Stat, string> = {
  STR: "Strength",
  DEX: "Dexterity",
  END: "Endurance",
  INT: "Intellect",
  EDU: "Education",
  SOC: "Social Standing",
  PSI: "Psionic Strength",
  TER: "Territory",
};

/** Noble titles by SOC, CRB p11. */
export const NOBLE_TITLES: Record<number, string> = {
  11: "Knight",
  12: "Baron",
  13: "Marquis",
  14: "Count",
  15: "Duke",
};

/** Draft table, CRB p19. `assignment` undefined means the Traveller picks. */
export const DRAFT: { roll: number; career: string; assignment?: string }[] = [
  { roll: 1, career: "navy" },
  { roll: 2, career: "army" },
  { roll: 3, career: "marine" },
  { roll: 4, career: "merchant", assignment: "merchant-marine" },
  { roll: 5, career: "scout" },
  { roll: 6, career: "agent", assignment: "law-enforcement" },
];
export const DRAFT_SOURCE = crb(19);

/** Life Events, CRB p46. */
export const LIFE_EVENTS: TableRow[] = [
  { roll: 2, text: "Sickness or injury.", effects: [{ t: "injury" }] },
  {
    roll: 3,
    text: "Birth or death: someone close to you dies, or a child is born into your circle.",
    effects: [{ t: "note", text: "A birth or death touched your life." }],
  },
  {
    roll: 4,
    text: "A romantic relationship ends badly.",
    effects: [
      {
        t: "choose",
        prompt: "Your former partner becomes",
        options: [
          { label: "A Rival", effects: [{ t: "associate", kind: "rival", note: "Former partner" }] },
          { label: "An Enemy", effects: [{ t: "associate", kind: "enemy", note: "Former partner" }] },
        ],
      },
    ],
  },
  {
    roll: 5,
    text: "A romantic relationship deepens, perhaps to marriage.",
    effects: [{ t: "associate", kind: "ally", note: "Partner" }],
  },
  { roll: 6, text: "You begin a new romantic relationship.", effects: [{ t: "associate", kind: "ally", note: "Partner" }] },
  { roll: 7, text: "You make a new contact.", effects: [{ t: "associate", kind: "contact" }] },
  {
    roll: 8,
    text: "Betrayal: a friend turns on you.",
    effects: [
      {
        t: "convert",
        from: ["contact", "ally"],
        to: ["rival", "enemy"],
        otherwise: [
          {
            t: "choose",
            options: [
              { label: "Gain a Rival", effects: [{ t: "associate", kind: "rival", note: "Betrayed you" }] },
              { label: "Gain an Enemy", effects: [{ t: "associate", kind: "enemy", note: "Betrayed you" }] },
            ],
          },
        ],
      },
    ],
  },
  { roll: 9, text: "You move to another world.", effects: [{ t: "qualifyDM", dm: 2 }] },
  { roll: 10, text: "Good fortune comes your way.", effects: [{ t: "benefitDM", dm: 2 }] },
  {
    roll: 11,
    text: "Crime: you commit, suffer or are accused of a crime.",
    effects: [
      {
        t: "choose",
        prompt: "The crime costs you",
        options: [
          { label: "Lose one Benefit roll", effects: [{ t: "benefitRolls", n: -1 }] },
          { label: "Go to prison next term", effects: [{ t: "nextTerm", career: "prisoner" }] },
        ],
      },
    ],
  },
  {
    roll: 12,
    text: "Something unusual happens.",
    effects: [
      {
        t: "roll",
        dice: "1D",
        results: [
          { min: 1, max: 1, text: "You encounter a psionic institute.", effects: [{ t: "psionicTest" }] },
          {
            min: 2,
            max: 2,
            text: "You spend time among aliens.",
            effects: [
              { t: "gain", what: "Science 1" },
              { t: "associate", kind: "contact", note: "Among an alien species" },
            ],
          },
          {
            min: 3,
            max: 3,
            text: "You come by a strange alien artefact.",
            effects: [{ t: "special", key: "possession", args: { item: "Alien artefact" } }],
          },
          { min: 4, max: 4, text: "Amnesia: something happened, and you do not know what.", effects: [{ t: "note", text: "A gap in your memory." }] },
          {
            min: 5,
            max: 5,
            text: "You brush against the highest levels of government.",
            effects: [{ t: "note", text: "Briefly met the highest echelons of the Imperium." }],
          },
          {
            min: 6,
            max: 6,
            text: "You hold a piece of ancient technology.",
            effects: [{ t: "special", key: "possession", args: { item: "Ancient technology" } }],
          },
        ],
      },
    ],
  },
];
export const LIFE_EVENTS_SOURCE = crb(46);

/** Injury, CRB p49. Effects are applied by the engine (player picks the characteristics). */
export const INJURY: { roll: number; name: string; text: string }[] = [
  { roll: 1, name: "Nearly killed", text: "One physical characteristic -1D, two others -2." },
  { roll: 2, name: "Severely injured", text: "One physical characteristic -1D." },
  { roll: 3, name: "Missing eye or limb", text: "STR or DEX -2." },
  { roll: 4, name: "Scarred", text: "Any physical characteristic -2." },
  { roll: 5, name: "Injured", text: "Any physical characteristic -1." },
  { roll: 6, name: "Lightly injured", text: "No permanent effect." },
];
export const INJURY_SOURCE = crb(49);

/** Medical Bills, CRB p49: share of restoration paid by the employer, by 2D + rank. */
export const MEDICAL_BILLS: Record<"military" | "civil" | "none", [number, number, number]> = {
  military: [75, 100, 100],
  civil: [50, 75, 100],
  none: [0, 50, 75],
};
export function medicalCover(row: "military" | "civil" | "none", total: number): number {
  const [a, b, c] = MEDICAL_BILLS[row];
  if (total >= 12) return c;
  if (total >= 8) return b;
  if (total >= 4) return a;
  return 0;
}
/** Cost to restore one lost characteristic point, CRB p49. */
export const RESTORE_COST_PER_POINT = 5000;

/**
 * Ageing, CRB p49. Rows by total (2D minus terms, plus anagathic terms).
 * `physical` lists the reductions to distinct physical characteristics;
 * `mental` the reductions to one mental characteristic.
 */
export function ageingEffect(total: number): { physical: number[]; mental: number[] } {
  if (total <= -6) return { physical: [2, 2, 2], mental: [1] };
  switch (total) {
    case -5:
      return { physical: [2, 2, 2], mental: [] };
    case -4:
      return { physical: [2, 2, 1], mental: [] };
    case -3:
      return { physical: [2, 1, 1], mental: [] };
    case -2:
      return { physical: [1, 1, 1], mental: [] };
    case -1:
      return { physical: [1, 1], mental: [] };
    case 0:
      return { physical: [1], mental: [] };
    default:
      return { physical: [], mental: [] };
  }
}
export const AGEING_SOURCE = crb(49);
/** Ageing starts at the end of the fourth term, CRB p48. */
export const AGEING_FROM_TERM = 4;
/** Ageing crisis: medical care costs 1D x Cr10000, CRB p49. */
export const AGEING_CRISIS_COST = 10000;
/** Anagathics, CRB p49: SOC 10+ to obtain, 1D x Cr25000 a term. */
export const ANAGATHICS = { check: "SOC 10+", costPerDie: 25000, source: crb(49) };

/** Benefits of Rank, CRB p46. */
export function rankBenefitRolls(highestRank: number): number {
  if (highestRank >= 5) return 3;
  if (highestRank >= 3) return 2;
  if (highestRank >= 1) return 1;
  return 0;
}
/** At rank 5 or 6, DM+1 to every Benefit roll from the career, CRB p46. */
export const HIGH_RANK_BENEFIT_DM = 1;
/** Cash column limit across all careers, CRB p46. */
export const MAX_CASH_ROLLS = 3;
/** Starting equipment allowance, CRB p46. */
export const STARTING_EQUIPMENT_LIMIT = 10000;

/** Pensions, CRB p48. */
export function pension(terms: number): number {
  if (terms < 5) return 0;
  if (terms <= 8) return 10000 + (terms - 5) * 2000;
  return 16000 + (terms - 8) * 2000;
}
export const PENSION_SOURCE = crb(48);

/** Skill packages, CRB p50. Every skill is at level 1. */
export const SKILL_PACKAGES: { id: string; name: string; text: string; skills: string[] }[] = [
  {
    id: "traveller",
    name: "Traveller",
    text: "All-round: trading one week, fighting the next.",
    skills: ["Deception", "Electronics", "Gun Combat", "Gunner", "Medic", "Persuade", "Pilot", "Stealth"],
  },
  {
    id: "explorer",
    name: "Explorer",
    text: "The fringes of Charted Space, new worlds and old relics.",
    skills: ["Astrogation", "Electronics", "Gun Combat", "Medic", "Pilot", "Recon", "Stealth", "Survival"],
  },
  {
    id: "mercenary",
    name: "Mercenary",
    text: "Ground combat for combat-heavy games.",
    skills: ["Electronics", "Medic", "Leadership", "Heavy Weapons", "Gun Combat", "Gun Combat", "Stealth", "Recon"],
  },
  {
    id: "diplomat",
    name: "Diplomat",
    text: "Government operatives and ambassadors.",
    skills: ["Admin", "Advocate", "Deception", "Diplomat", "Electronics", "Persuade", "Stealth", "Streetwise"],
  },
  {
    id: "trader",
    name: "Trader",
    text: "Trade and commerce first.",
    skills: ["Advocate", "Astrogation", "Broker", "Diplomat", "Electronics", "Medic", "Pilot", "Streetwise"],
  },
  {
    id: "investigator",
    name: "Investigator",
    text: "Crimes and mysteries.",
    skills: ["Admin", "Advocate", "Deception", "Electronics", "Gun Combat", "Investigate", "Persuade", "Stealth", "Streetwise"],
  },
  {
    id: "starship",
    name: "Starship",
    text: "Life aboard spacecraft.",
    skills: ["Astrogation", "Electronics", "Engineer", "Gunner", "Mechanic", "Medic", "Pilot", "Tactics (naval)"],
  },
  {
    id: "criminal",
    name: "Criminal",
    text: "Crime and elaborate heists.",
    skills: ["Broker", "Deception", "Electronics", "Medic", "Persuade", "Pilot", "Stealth", "Streetwise"],
  },
];
export const SKILL_PACKAGES_SOURCE = crb(50);

/** The connections rule, CRB p19: up to two free skills, none above 3, never Jack-of-all-Trades. */
export const CONNECTIONS = { max: 2, maxLevel: 3, except: ["Jack-of-all-Trades"], source: crb(19) };

/** Skill limits during creation, CRB p18. */
export const SKILL_MAX_LEVEL = 4;
export const SKILL_TOTAL_FACTOR = 3;

/** Pre-career education, CRB pp16-17. */
export const UNIVERSITY = {
  source: crb(16),
  entry: "EDU 6+",
  termDM: [0, -1, -2],
  socDM: { min: 9, dm: 1 },
  skills: [
    "Admin",
    "Advocate",
    "Animals (training)",
    "Animals (veterinary)",
    "Art",
    "Astrogation",
    "Electronics",
    "Engineer",
    "Language",
    "Medic",
    "Navigation",
    "Profession",
    "Science",
  ],
  graduation: "INT 6+",
  honours: 10,
  /** Careers whose qualification gets DM+1 (DM+2 with honours) after graduating, with the assignment if limited. */
  careerBonus: [
    { career: "agent" },
    { career: "army" },
    { career: "citizen", assignment: "corporate" },
    { career: "entertainer", assignment: "journalist" },
    { career: "marine" },
    { career: "navy" },
    { career: "scholar" },
    { career: "scout" },
  ],
};

export const ACADEMIES: { career: string; name: string; entry: string }[] = [
  { career: "army", name: "Army academy", entry: "END 7+" },
  { career: "marine", name: "Marine academy", entry: "END 8+" },
  { career: "navy", name: "Naval academy", entry: "INT 8+" },
];
export const ACADEMY = {
  source: crb(16),
  termDM: [0, -2, -4],
  graduation: "INT 7+",
  honours: 11,
  graduationDMs: [
    { stat: "END" as Stat, min: 8, dm: 1 },
    { stat: "SOC" as Stat, min: 8, dm: 1 },
  ],
};

/** Pre-career Events, CRB p17. */
export const PRE_CAREER_EVENTS: TableRow[] = [
  {
    roll: 2,
    text: "An underground psionic group senses potential in you.",
    effects: [{ t: "psionicTest" }],
  },
  {
    roll: 3,
    text: "A deep personal tragedy derails your studies.",
    effects: [{ t: "noGraduate" }],
  },
  {
    roll: 4,
    text: "A prank goes wrong and someone gets hurt.",
    effects: [
      {
        t: "check",
        check: "SOC 8+",
        pass: [{ t: "associate", kind: "rival", note: "Victim of a prank" }],
        fail: [{ t: "associate", kind: "enemy", note: "Victim of a prank" }],
        on2: [{ t: "associate", kind: "enemy", note: "Victim of a prank" }, { t: "noGraduate" }, { t: "nextTerm", career: "prisoner" }],
      },
    ],
  },
  { roll: 5, text: "You party as hard as you study.", effects: [{ t: "gain", what: "Carouse 1" }] },
  {
    roll: 6,
    text: "You fall in with a close-knit group who swear lifelong friendship.",
    effects: [{ t: "associate", kind: "ally", count: "D3", note: "Student friend" }],
  },
  { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
  {
    roll: 8,
    text: "You join a political movement.",
    effects: [
      {
        t: "check",
        check: "SOC 8+",
        pass: [
          { t: "associate", kind: "ally", note: "Within the movement" },
          { t: "associate", kind: "enemy", note: "Opposes the movement" },
        ],
      },
    ],
  },
  {
    roll: 9,
    text: "You take up a hobby or side study.",
    effects: [{ t: "anySkill", level: 0, except: ["Jack-of-all-Trades"] }],
  },
  {
    roll: 10,
    text: "A new tutor rubs you up the wrong way and you set out to prove them wrong.",
    effects: [{ t: "special", key: "tutorChallenge" }],
  },
  {
    roll: 11,
    text: "War comes and a draft sweeps the campus.",
    effects: [{ t: "special", key: "warDraft" }],
  },
  { roll: 12, text: "Your initiative wins wide recognition.", effects: [{ t: "gain", what: "SOC +1" }] },
];
export const PRE_CAREER_EVENTS_SOURCE = crb(17);

/** War draft from pre-career event 11, CRB p17: 1-3 Army, 4-5 Marine, 6 Navy. */
export function warDraftCareer(roll: number): string {
  return roll <= 3 ? "army" : roll <= 5 ? "marine" : "navy";
}

/** Prisoner parole threshold starts at 1D+2 and never exceeds 12, CRB p52. */
export const PAROLE = { base: 2, max: 12 };

/** Psionic Training, CRB p228. Learning DM per talent. */
export const PSIONIC_TRAINING: { talent: string; dm: number }[] = [
  { talent: "Telepathy", dm: 4 },
  { talent: "Clairvoyance", dm: 3 },
  { talent: "Telekinesis", dm: 2 },
  { talent: "Awareness", dm: 1 },
  { talent: "Teleportation", dm: 0 },
];
export const PSIONICS = {
  source: crb(228),
  testCost: 5000,
  trainingCost: 100000,
  learnTarget: 8,
};

/** Spacecraft Quirks, CRB p188, rolled 1D times for a ship received as a benefit. Columns: trader, military, other. */
export const SHIP_QUIRKS: { roll: number; trader: string; military: string; other: string }[] = [
  { roll: 2, trader: "Black-listed in several systems; DM-1 to Broker", military: "Severely damaged: -1 Hull", other: "Leaky reactor: radiation risk on jump" },
  { roll: 3, trader: "Well maintained: half maintenance", military: "Sensors upgraded one grade", other: "Luxurious: DM+1 to Steward" },
  { roll: 4, trader: "Concealed smuggling compartments", military: "Extra turret if possible", other: "Library holds wrong information" },
  { roll: 5, trader: "Cargo bay tainted by spills", military: "Fought in a notorious battle; has enemies", other: "Disturbing psionic echoes" },
  { roll: 6, trader: "Damaged sensors: DM-1 Electronics (sensors)", military: "Damaged sensors: DM-1 Electronics (sensors)", other: "Damaged sensors: DM-1 Electronics (sensors)" },
  { roll: 7, trader: "DM-1 to all repairs", military: "DM-1 to all repairs", other: "DM-1 to all repairs" },
  { roll: 8, trader: "Double maintenance costs", military: "Double maintenance costs", other: "Double maintenance costs" },
  { roll: 9, trader: "Severely damaged: -10% Hull", military: "Severely damaged: -10% Hull", other: "Severely damaged: -10% Hull" },
  { roll: 10, trader: "Damaged thrusters: DM-1 to Pilot", military: "Damaged thrusters: DM-1 to Pilot", other: "Damaged thrusters: DM-1 to Pilot" },
  { roll: 11, trader: "Famous, respected trader", military: "Served with distinction", other: "Library holds secret information" },
  { roll: 12, trader: "Computer upgraded one grade", military: "Added weapon up to MCr2", other: "Sensors upgraded one grade" },
];
export const SHIP_QUIRKS_SOURCE = crb(188);

/** Benefit item limits, CRB p47. */
export const BENEFIT_LIMITS = {
  armour: { cost: 10000, tl: 12, upgrade: 25000 },
  blade: { cost: 1000, tl: 12 },
  gun: { cost: 3000, tl: 12 },
  weapon: { cost: 3000, tl: 12 },
  implant: { cost: 75000, tl: 12 },
  science: { cost: 2000, tl: 12 },
  vehicle: { cost: 300000, tl: 10 },
  smallCraft: { costMCr: 10, tl: 12 },
  source: crb(47),
};
/** A ship benefit pays off 25% of the mortgage each time it is rolled, CRB p47. */
export const SHIP_MORTGAGE_STEP = 25;
/** Excess SOC above the maximum becomes Ship Shares, CRB p47. */
export const SOC_EXCESS_TO_SHARES = true;

/** Effects the engine uses for the Unusual Event "Aliens", and similar, kept here for reuse. */
export const NO_EFFECT: Effect[] = [];
