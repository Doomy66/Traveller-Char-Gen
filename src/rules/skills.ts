import type { Source } from "./types";

/**
 * The skill list, CRB pp58-72, with each skill's specialities. A Traveller
 * with level 0 in a skill can use every speciality at 0; level 1 and above is
 * held per speciality (CRB p58). Profession is the exception: each speciality
 * is learned separately (CRB p70), which matters only for display.
 */
export interface SkillDef {
  name: string;
  specialities?: string[];
  /** Players may name their own speciality (languages, professions). */
  openSpecialities?: boolean;
  /** Psionic talents (CRB p229) and Aslan skills are flagged so lists can filter them. */
  group?: "psionic" | "aslan";
  source: Source;
}

const crb = (page: number): Source => ({ book: "CRB", page });

export const SKILLS: SkillDef[] = [
  { name: "Admin", source: crb(64) },
  { name: "Advocate", source: crb(64) },
  { name: "Animals", specialities: ["handling", "veterinary", "training"], source: crb(64) },
  { name: "Art", specialities: ["performer", "holography", "instrument", "visual media", "write"], source: crb(65) },
  { name: "Astrogation", source: crb(65) },
  { name: "Athletics", specialities: ["dexterity", "endurance", "strength"], source: crb(65) },
  { name: "Broker", source: crb(66) },
  { name: "Carouse", source: crb(66) },
  { name: "Deception", source: crb(66) },
  { name: "Diplomat", source: crb(66) },
  { name: "Drive", specialities: ["hovercraft", "mole", "track", "walker", "wheel"], source: crb(66) },
  { name: "Electronics", specialities: ["comms", "computers", "remote ops", "sensors"], source: crb(67) },
  { name: "Engineer", specialities: ["m-drive", "j-drive", "life support", "power"], source: crb(67) },
  { name: "Explosives", source: crb(68) },
  { name: "Flyer", specialities: ["airship", "grav", "ornithopter", "rotor", "wing"], source: crb(68) },
  { name: "Gambler", source: crb(68) },
  { name: "Gunner", specialities: ["turret", "ortillery", "screen", "capital"], source: crb(68) },
  { name: "Gun Combat", specialities: ["archaic", "energy", "slug"], source: crb(68) },
  { name: "Heavy Weapons", specialities: ["artillery", "portable", "vehicle"], source: crb(69) },
  { name: "Investigate", source: crb(69) },
  { name: "Jack-of-all-Trades", source: crb(69) },
  {
    name: "Language",
    specialities: ["Galanglic", "Vilani", "Zdetl", "Oynprith", "Trokh", "Gvegh"],
    openSpecialities: true,
    source: crb(69),
  },
  { name: "Leadership", source: crb(69) },
  { name: "Mechanic", source: crb(69) },
  { name: "Medic", source: crb(70) },
  { name: "Melee", specialities: ["unarmed", "blade", "bludgeon", "natural"], source: crb(70) },
  { name: "Navigation", source: crb(70) },
  { name: "Persuade", source: crb(70) },
  { name: "Pilot", specialities: ["small craft", "spacecraft", "capital ships"], source: crb(70) },
  {
    name: "Profession",
    specialities: ["belter", "biologicals", "civil engineering", "construction", "hydroponics", "polymers"],
    openSpecialities: true,
    source: crb(70),
  },
  { name: "Recon", source: crb(71) },
  {
    name: "Science",
    specialities: [
      "archaeology",
      "astronomy",
      "biology",
      "chemistry",
      "cosmology",
      "cybernetics",
      "economics",
      "genetics",
      "history",
      "linguistics",
      "philosophy",
      "physics",
      "planetology",
      "psionicology",
      "psychology",
      "robotics",
      "sophontology",
      "xenology",
    ],
    source: crb(71),
  },
  { name: "Seafarer", specialities: ["ocean ships", "personal", "sail", "submarine"], source: crb(71) },
  { name: "Stealth", source: crb(71) },
  { name: "Steward", source: crb(72) },
  { name: "Streetwise", source: crb(72) },
  { name: "Survival", source: crb(72) },
  { name: "Tactics", specialities: ["military", "naval"], source: crb(72) },
  { name: "Vacc Suit", source: crb(72) },
  // Psionic talents, CRB p229.
  { name: "Telepathy", group: "psionic", source: crb(229) },
  { name: "Clairvoyance", group: "psionic", source: crb(229) },
  { name: "Telekinesis", group: "psionic", source: crb(229) },
  { name: "Awareness", group: "psionic", source: crb(229) },
  { name: "Teleportation", group: "psionic", source: crb(229) },
  // Aslan skills, used by the Glorious Empire careers.
  { name: "Independence", group: "aslan", source: { book: "GE", page: 60 } },
  { name: "Tolerance", group: "aslan", source: { book: "GE", page: 57 } },
];

const BY_NAME = new Map(SKILLS.map((s) => [s.name.toLowerCase(), s]));

/** Some tables spell a few names differently; this maps them to the canonical skill. */
const ALIASES: Record<string, string> = {
  "jack of all trades": "Jack-of-all-Trades",
  "jack-of-all-trades": "Jack-of-all-Trades",
  "vacc-suit": "Vacc Suit",
  "gun-combat": "Gun Combat",
  "heavy weapon": "Heavy Weapons",
  electronic: "Electronics",
  gunnery: "Gunner",
};

export function findSkill(name: string): SkillDef | undefined {
  const key = name.trim().toLowerCase();
  const alias = ALIASES[key];
  return BY_NAME.get(alias ? alias.toLowerCase() : key);
}

export function hasSpecialities(name: string): boolean {
  const def = findSkill(name);
  return def?.specialities !== undefined && def.specialities.length > 0;
}

export const PSIONIC_TALENTS = SKILLS.filter((s) => s.group === "psionic").map((s) => s.name);

/** Skills a Traveller may pick from when told "any skill": every non-psionic skill. */
export function anySkillNames(includeAslan: boolean): string[] {
  return SKILLS.filter((s) => s.group === undefined || (includeAslan && s.group === "aslan")).map((s) => s.name);
}

/** Background skills, CRB p9. */
export const BACKGROUND_SKILLS = [
  "Admin",
  "Animals",
  "Art",
  "Athletics",
  "Carouse",
  "Drive",
  "Electronics",
  "Flyer",
  "Language",
  "Mechanic",
  "Medic",
  "Profession",
  "Science",
  "Seafarer",
  "Streetwise",
  "Survival",
  "Vacc Suit",
];
