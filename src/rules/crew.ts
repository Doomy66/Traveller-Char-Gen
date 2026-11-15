/**
 * Ship's crew positions, for rolling a crew. CharSpec 12.
 *
 * Positions, skills and monthly salaries are the Crew Requirements table of
 * High Guard Update 2022 (pp23-24), which repeats and extends CRB p182; the
 * Marine is CRB p154. Salary is for skill level 1 and rises by half for
 * every level above it (HG p23, CRB p182).
 *
 * `careers` are the careers and assignments a sensible NPC would follow to
 * learn the job: "career" or "career/assignment". They only steer the
 * choices; the rules decide what the NPC actually learns.
 */

export interface CrewSkill {
  skill: string;
  /** A speciality, or undefined for the skill itself or its best speciality. */
  spec?: string;
}

export interface CrewPosition {
  id: string;
  name: string;
  /** Any one of these at the minimum level fills the post. */
  skills: CrewSkill[];
  /** Cr per month at skill 1; 0 where the book gives none. */
  salary: number;
  careers: string[];
  source: string;
  note?: string;
  /** Narrower skills the user may insist on instead of `skills`, such as one Gun Combat speciality. */
  options?: { label: string; skills: CrewSkill[] }[];
}

/** The post with option `i` taken in place of its skills (0, or no such option: the post as it is). */
export function crewVariant(p: CrewPosition, i: number): CrewPosition {
  const o = i > 0 ? p.options?.[i - 1] : undefined;
  return o ? { ...p, skills: o.skills } : p;
}

export const SALARY_PER_LEVEL_ABOVE_1 = 0.5;

export const CREW_POSITIONS: CrewPosition[] = [
  {
    id: "captain",
    name: "Captain",
    skills: [{ skill: "Leadership" }, { skill: "Broker" }, { skill: "Admin" }],
    salary: 10_000,
    careers: ["navy/line-crew", "merchant/free-trader", "merchant/merchant-marine", "merchant/broker", "ge-fleet-officer/commander", "ge-fleet-officer/shipmaster"],
    source: "HG p24",
    note: "The book names no skill for a captain; any of these will do.",
    options: ["Leadership", "Broker", "Admin"].map((skill) => ({ label: skill, skills: [{ skill }] })),
  },
  {
    id: "pilot",
    name: "Pilot",
    skills: [{ skill: "Pilot", spec: "spacecraft" }],
    salary: 6_000,
    careers: ["navy/flight", "scout/courier", "merchant/free-trader", "ge-fleet/pilot"],
    source: "HG p24",
  },
  {
    id: "small-craft-pilot",
    name: "Small craft pilot",
    skills: [{ skill: "Pilot", spec: "small craft" }],
    salary: 6_000,
    careers: ["navy/flight", "scout/surveyor", "marine/star-marine", "ge-fleet/pilot"],
    source: "HG p24",
    note: "A pilot for each small craft carried.",
  },
  {
    id: "astrogator",
    name: "Astrogator",
    skills: [{ skill: "Astrogation" }],
    salary: 5_000,
    careers: ["scout/courier", "scout/explorer", "navy/flight", "merchant/free-trader", "ge-fleet-officer/navigator"],
    source: "HG p24",
  },
  {
    id: "engineer",
    name: "Engineer",
    skills: [
      { skill: "Engineer", spec: "j-drive" },
      { skill: "Engineer", spec: "m-drive" },
      { skill: "Engineer", spec: "power" },
    ],
    salary: 4_000,
    careers: ["navy/engineer-gunner", "merchant/merchant-marine", "scout/courier", "ge-fleet/engineer", "ge-slave/technician"],
    source: "HG p24",
    note: "Any of j-drive, m-drive or power.",
  },
  {
    id: "maintenance",
    name: "Maintenance",
    skills: [{ skill: "Mechanic" }],
    salary: 1_000,
    careers: ["navy/engineer-gunner", "merchant/merchant-marine", "army/support", "ge-slave/technician", "ge-fleet/crew"],
    source: "HG p24",
  },
  {
    id: "gunner",
    name: "Gunner",
    skills: [{ skill: "Gunner" }],
    salary: 2_000,
    careers: ["navy/engineer-gunner", "ge-fleet/gunner", "marine/star-marine", "rogue/pirate"],
    source: "HG p24",
    options: ["turret", "ortillery", "screen", "capital"].map((spec) => ({ label: `Gunner (${spec})`, skills: [{ skill: "Gunner", spec }] })),
  },
  {
    id: "sensor-operator",
    name: "Sensor operator",
    skills: [{ skill: "Electronics", spec: "sensors" }],
    salary: 4_000,
    careers: ["navy/line-crew", "scout/surveyor", "ge-fleet/crew", "agent/intelligence"],
    source: "HG p24",
  },
  {
    id: "steward",
    name: "Steward",
    skills: [{ skill: "Steward" }],
    salary: 2_000,
    careers: ["merchant/merchant-marine", "merchant/free-trader", "navy/line-crew", "ge-slave/servant"],
    source: "HG p24",
  },
  {
    id: "medic",
    name: "Medic",
    skills: [{ skill: "Medic" }],
    salary: 4_000,
    careers: ["scholar/physician", "army/support", "marine/support", "ge-warrior/support"],
    source: "HG p24",
  },
  {
    id: "administrator",
    name: "Administrator",
    skills: [{ skill: "Admin" }],
    salary: 1_500,
    careers: ["noble/administrator", "citizen/corporate", "merchant/broker", "agent/corporate"],
    source: "HG p24",
  },
  {
    id: "officer",
    name: "Officer",
    skills: [{ skill: "Leadership" }, { skill: "Persuade" }],
    salary: 5_000,
    careers: ["navy/line-crew", "marine/star-marine", "army/infantry", "ge-fleet-officer/commander", "ge-warrior-officer/leader"],
    source: "HG p24",
  },
  {
    id: "marine",
    name: "Marine",
    skills: [{ skill: "Gun Combat" }, { skill: "Melee" }],
    salary: 1_000,
    careers: ["marine/star-marine", "marine/ground-assault", "army/infantry", "ge-warrior/imperial-guard", "ge-slave/dog-soldier"],
    source: "CRB p154",
    options: ["archaic", "energy", "slug"].map((spec) => ({ label: `Gun Combat (${spec})`, skills: [{ skill: "Gun Combat", spec }] })),
  },
];

export function findPosition(id: string): CrewPosition {
  const p = CREW_POSITIONS.find((x) => x.id === id);
  if (!p) throw new Error(`No crew position ${id}`);
  return p;
}

/** Monthly salary at a skill level: the table's figure at 1, half as much again per level above. */
export function crewSalary(p: CrewPosition, level: number): number {
  return Math.round(p.salary * (1 + SALARY_PER_LEVEL_ABOVE_1 * Math.max(0, level - 1)));
}

/** The text a position's skill appears as in tables: "Pilot (spacecraft)" or "Admin". */
export function crewSkillText(s: CrewSkill): string {
  return s.spec ? `${s.skill} (${s.spec})` : s.skill;
}

/** The crew line of each Core ship (CRB pp190-216), to start from. Counts by position id. */
export const CREW_PRESETS: { name: string; page: number; counts: Record<string, number> }[] = [
  { name: "Scout/Courier", page: 190, counts: { pilot: 1, astrogator: 1, engineer: 1 } },
  { name: "Seeker Mining Ship", page: 192, counts: { pilot: 1, astrogator: 1, engineer: 1 } },
  { name: "Free Trader", page: 194, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1, steward: 1 } },
  { name: "Far Trader", page: 196, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1, steward: 1 } },
  { name: "Safari Ship", page: 198, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1, steward: 1 } },
  { name: "System Defence Boat", page: 200, counts: { captain: 1, pilot: 3, engineer: 1, maintenance: 1, medic: 1, gunner: 4, administrator: 1, officer: 1 } },
  { name: "Yacht", page: 202, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1, steward: 1 } },
  { name: "Close Escort", page: 204, counts: { captain: 1, pilot: 3, astrogator: 1, engineer: 4, medic: 1, gunner: 8, administrator: 1, maintenance: 1, officer: 1 } },
  { name: "Laboratory Ship", page: 206, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1 } },
  { name: "Patrol Corvette", page: 208, counts: { pilot: 1, astrogator: 1, engineer: 2, medic: 1, gunner: 4, marine: 8 } },
  { name: "Subsidised Merchant", page: 210, counts: { pilot: 1, astrogator: 1, engineer: 1, medic: 1, steward: 1 } },
  { name: "Survey Scout", page: 212, counts: { pilot: 1, astrogator: 1, engineer: 2, maintenance: 1 } },
  { name: "Subsidised Liner", page: 214, counts: { pilot: 1, astrogator: 1, engineer: 2, medic: 1, steward: 1 } },
  { name: "Mercenary Cruiser", page: 216, counts: { pilot: 1, astrogator: 1, engineer: 3, medic: 1 } },
];
