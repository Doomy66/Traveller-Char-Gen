import { findSkill, hasSpecialities } from "../rules/skills";
import { characteristicDM, SKILL_MAX_LEVEL, SKILL_TOTAL_FACTOR } from "../rules/tables";
import type { AssociateKind, Stat } from "../rules/types";

/**
 * A Traveller as it stands at any moment of creation. Plain data, so it can be
 * copied, saved as JSON and drawn by the sheet. CharSpec 4.
 */

/** A skill: its general level (0 when trained without a speciality), and per-speciality levels. */
export interface SkillState {
  /** Level for skills without specialities; 0 for a skill with specialities known at 0. */
  level: number;
  specs: Record<string, number>;
}

export interface Associate {
  kind: AssociateKind;
  note: string;
  /** When and where they came from, for the history. */
  origin: string;
}

export interface CareerRecord {
  careerId: string;
  assignmentId: string;
  /** Assignments held, in order (for "reroll" changes of assignment). */
  assignments: string[];
  terms: number;
  rank: number;
  officer: boolean;
  highestRank: number;
  /** Benefit rolls earned (one per term not lost, plus events). */
  benefitRolls: number;
  /** DMs to single Benefit rolls from events, used one per roll. */
  benefitDMs: number[];
  /** DM to every Benefit roll from this career (events). */
  benefitDMAll: number;
  survivalDM: number;
  ended: boolean;
  endReason?: string;
  mustered: boolean;
  /** Was this career entered through the draft? */
  drafted?: boolean;
  /** Prisoner parole threshold. */
  parole?: number;
  /** Every Benefit roll from this career was lost. */
  noBenefits?: boolean;
  /** Extra rolls that must go on the Cash column. */
  cashOnlyRolls?: number;
  /** Glorious Empire: a term in this career included a Mercenary Event. */
  mercenary?: boolean;
}

export interface Possession {
  name: string;
  detail?: string;
  cost?: number;
  /** Weapons: the skill they use. */
  skill?: string;
  source: string;
}

export interface ShipBenefit {
  shipId: string;
  name: string;
  /** Percentage of the mortgage paid off (Free Trader, Lab Ship, Yacht), or 100 for a Scout loaned by the service. */
  paidPercent: number;
  quirks: string[];
  note?: string;
}

export interface HistoryEntry {
  term: number;
  age: number;
  text: string;
  kind?: "event" | "mishap" | "roll" | "career" | "benefit" | "skill" | "info" | "warn";
}

export type Gender = "female" | "male" | "other";

export interface Traveller {
  name: string;
  speciesId: string;
  gender: Gender;
  homeworld: string;
  age: number;
  /** Characteristics now. PSI is present only once tested; TER only for species that have it. */
  stats: Partial<Record<Stat, number>>;
  /** As rolled, after species modifiers, before any career changes. */
  initialStats: Partial<Record<Stat, number>>;
  /** Aslan rite of passage score (Glorious Empire), if rolled. */
  rite?: number;
  skills: Record<string, SkillState>;
  careers: CareerRecord[];
  /** Total terms served, education included. */
  terms: number;
  associates: Associate[];
  cash: number;
  /** Medical and anagathic bills, paid out of cash at the end. */
  debt: number;
  shipShares: number;
  clanShares: number;
  /** Credits a year. */
  pension: number;
  cashRolls: number;
  possessions: Possession[];
  ships: ShipBenefit[];
  tasMember: boolean;
  /** How many times each named benefit has been rolled, for the "if you roll this again" rules. */
  benefitCounts: Record<string, number>;
  history: HistoryEntry[];
  /** Traits from species and events. */
  traits: string[];
  /** Long-term wounds and lost characteristic points not restored. */
  wounds: string[];
  /** Characteristic points lost to injury and not yet restored, by characteristic. */
  injuryLoss: Partial<Record<Stat, number>>;
  education?: {
    kind: "university" | "academy";
    career?: string;
    graduated: boolean;
    honours: boolean;
    /** Skills chosen at entry (university). */
    skills: string[];
    /** Whether the graduate's bonuses have been used. */
    commissionUsed: boolean;
    autoEntryUsed: boolean;
    /** Allowed automatic entry despite failing (academy, roll above 2). */
    autoEntryOnFail?: boolean;
  };
  drafted: boolean;
  psionAllowed: boolean;
  psiTested: boolean;
  /** Talents already attempted (for the DM-1 per attempt). */
  talentAttempts: number;
  anagathics: { active: boolean; terms: number; everUsed: boolean };
  ageingCrisis: boolean;
  /** One-shot modifiers waiting for the next roll of that kind. */
  pending: { qualifyDM: number; qualifyCareerDM: Record<string, number>; advanceDM: number; survivalDM: number };
  /** Forced next term: a career id, "draft", or "drifter". */
  forcedNext?: { career: string; assignment?: string };
  /** Glorious Empire: careers the Traveller is limited to. */
  restrictTo?: string[];
  slave: boolean;
  /** Benefit DMs and rolls earned outside a career (education, a forced term), used at the next muster-out. */
  looseBenefitDMs: number[];
  looseBenefitRolls: number;
  /** Glorious Empire: careers outside the Empire are open ("core"). */
  leftEmpire?: "hierate" | "core";
  /** After a forced term, return to this career. */
  returnTo?: string;
  /** Dead (only the Dog Soldier mishap can do this). */
  dead: boolean;
  /** Glorious Empire: the next term must change assignment within the career. */
  changeAssignment?: boolean;
  skillPackage?: string;
  connections: number;
  goal: string;
  notes: string;
  finished: boolean;
}

export function emptyTraveller(): Traveller {
  return {
    name: "",
    speciesId: "human",
    gender: "other",
    homeworld: "",
    age: 18,
    stats: {},
    initialStats: {},
    skills: {},
    careers: [],
    terms: 0,
    associates: [],
    cash: 0,
    debt: 0,
    shipShares: 0,
    clanShares: 0,
    pension: 0,
    cashRolls: 0,
    possessions: [],
    ships: [],
    tasMember: false,
    benefitCounts: {},
    history: [],
    traits: [],
    wounds: [],
    injuryLoss: {},
    drafted: false,
    psionAllowed: false,
    psiTested: false,
    talentAttempts: 0,
    anagathics: { active: false, terms: 0, everUsed: false },
    ageingCrisis: false,
    pending: { qualifyDM: 0, qualifyCareerDM: {}, advanceDM: 0, survivalDM: 0 },
    slave: false,
    looseBenefitDMs: [],
    looseBenefitRolls: 0,
    dead: false,
    connections: 0,
    goal: "",
    notes: "",
    finished: false,
  };
}

export function stat(t: Traveller, s: Stat): number {
  return t.stats[s] ?? 0;
}

export function dm(t: Traveller, s: Stat): number {
  if (t.stats[s] === undefined) return -3;
  return characteristicDM(t.stats[s]!);
}

/** Skill level for a check: the speciality if named, else the best held; undefined if untrained. */
export function skillLevel(t: Traveller, name: string, spec?: string): number | undefined {
  const s = t.skills[name];
  if (!s) return undefined;
  if (spec !== undefined) return s.specs[spec] ?? s.level;
  const specLevels = Object.values(s.specs);
  return Math.max(s.level, ...specLevels);
}

/** Level of a specific speciality, or of the skill when it has none; undefined if untrained. */
export function exactLevel(t: Traveller, name: string, spec?: string): number | undefined {
  const s = t.skills[name];
  if (!s) return undefined;
  if (spec !== undefined) return s.specs[spec] ?? (name === "Profession" ? undefined : s.level);
  return s.level;
}

/** Total skill levels, for the 3 x (INT + EDU) limit (CRB p18). */
export function totalSkillLevels(t: Traveller): number {
  let total = 0;
  for (const s of Object.values(t.skills)) {
    total += s.level;
    for (const v of Object.values(s.specs)) total += v;
  }
  return total;
}

export function skillCap(t: Traveller): number {
  return SKILL_TOTAL_FACTOR * (stat(t, "INT") + stat(t, "EDU"));
}

export type SkillChange = { ok: true; from: number | undefined; to: number } | { ok: false; reason: string };

/**
 * Set a skill to `level` if that is higher than what the Traveller has.
 * `spec` is required for level 1+ in a skill with specialities.
 * `limit` is the creation cap (4) or another cap (connections: 3).
 */
export function setSkill(t: Traveller, name: string, spec: string | undefined, level: number, limit = SKILL_MAX_LEVEL): SkillChange {
  const def = findSkill(name);
  const canonical = def?.name ?? name;
  const specced = hasSpecialities(canonical) || def?.openSpecialities === true;
  const cur = specced && level >= 1 ? exactLevel(t, canonical, spec) : exactLevel(t, canonical);
  if (cur !== undefined && cur >= level) return { ok: false, reason: `already ${level === 0 ? "trained" : `at ${cur}`}` };
  if (level > limit) {
    if (cur !== undefined && cur >= limit) return { ok: false, reason: `already at the limit of ${limit}` };
    level = limit;
  }
  const added = level - Math.max(cur ?? 0, 0);
  if (added > 0 && totalSkillLevels(t) + added > skillCap(t)) {
    return { ok: false, reason: `total skill levels would pass 3 x (INT + EDU) = ${skillCap(t)}` };
  }
  const s = (t.skills[canonical] ??= { level: 0, specs: {} });
  if (specced && level >= 1) {
    if (spec === undefined) throw new Error(`${canonical} needs a speciality`);
    s.specs[spec] = level;
  } else {
    s.level = Math.max(s.level, level);
  }
  return { ok: true, from: cur, to: level };
}

/** Raise a skill one level (or to 1 if untrained). */
export function raiseSkill(t: Traveller, name: string, spec: string | undefined, limit = SKILL_MAX_LEVEL): SkillChange {
  const def = findSkill(name);
  const canonical = def?.name ?? name;
  const specced = hasSpecialities(canonical) || def?.openSpecialities === true;
  const cur = specced ? exactLevel(t, canonical, spec) : exactLevel(t, canonical);
  const target = cur === undefined ? 1 : cur + 1;
  return setSkill(t, canonical, spec, target, limit);
}

export function hasSkill(t: Traveller, name: string): boolean {
  return t.skills[name] !== undefined;
}

/** Display form: "Gun Combat (slug) 2", "Electronics 0". A skill with specialities shows its specialities, or the skill at 0 if it has none. */
export function skillList(t: Traveller): { name: string; level: number }[] {
  const out: { name: string; level: number }[] = [];
  for (const [name, s] of Object.entries(t.skills)) {
    const specs = Object.entries(s.specs);
    if (specs.length === 0) out.push({ name, level: s.level });
    else for (const [sp, lv] of specs) out.push({ name: `${name} (${sp})`, level: lv });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The skill list a skill with specialities shows on the sheet: "Electronics 0, Electronics (comms) 1". */
export function skillSummary(t: Traveller): string {
  return skillList(t)
    .map((s) => `${s.name} ${s.level}`)
    .join(", ");
}

export function upp(t: Traveller): string {
  const hex = (n: number | undefined) => (n === undefined ? "?" : n.toString(36).toUpperCase());
  return ["STR", "DEX", "END", "INT", "EDU", "SOC"].map((s) => hex(t.stats[s as Stat])).join("");
}

export function currentCareer(t: Traveller): CareerRecord | undefined {
  const last = t.careers[t.careers.length - 1];
  return last && !last.ended ? last : undefined;
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}
