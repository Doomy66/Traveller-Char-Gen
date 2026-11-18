import { findCareer, hasCareer } from "./careers/index";
import { findSkill } from "./skills";
import type { Stat } from "./types";

const SCIENCES = findSkill("Science")!.specialities ?? [];

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
  /** For one person doing two jobs: further skills, any one of each group, also needed at the level. */
  also?: CrewSkill[][];
  /**
   * The characteristics the post's work leans on, the most important first. An NPC rolled for
   * the post puts their best characteristic rolls there, the rest at random (crewAnswerer), as
   * a player making a character for the job would.
   */
  stats?: Stat[];
}

/** Every group of skills a post needs: its own, and any `also`. */
export function skillGroups(p: CrewPosition): CrewSkill[][] {
  return [p.skills, ...(p.also ?? [])];
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
    stats: ["SOC", "INT"],
    skills: [{ skill: "Leadership" }, { skill: "Tactics", spec: "naval" }, { skill: "Broker" }, { skill: "Admin" }],
    salary: 10_000,
    careers: ["navy/line-crew", "merchant/free-trader", "merchant/merchant-marine", "merchant/broker", "ge-fleet-officer/commander", "ge-fleet-officer/shipmaster"],
    source: "HG p24",
    note: "The book names no skill for a captain; any of these will do.",
    options: [{ skill: "Leadership" }, { skill: "Tactics", spec: "naval" }, { skill: "Broker" }, { skill: "Admin" }].map((s) => ({ label: crewSkillText(s), skills: [s] })),
  },
  {
    id: "pilot",
    name: "Pilot",
    stats: ["DEX"],
    skills: [{ skill: "Pilot", spec: "spacecraft" }],
    salary: 6_000,
    careers: ["navy/flight", "scout/courier", "merchant/free-trader", "ge-fleet/pilot"],
    source: "HG p24",
  },
  {
    id: "small-craft-pilot",
    name: "Small craft pilot",
    stats: ["DEX"],
    skills: [{ skill: "Pilot", spec: "small craft" }],
    salary: 6_000,
    careers: ["navy/flight", "scout/surveyor", "marine/star-marine", "ge-fleet/pilot"],
    source: "HG p24",
    note: "A pilot for each small craft carried.",
  },
  {
    id: "astrogator",
    name: "Astrogator",
    stats: ["EDU", "INT"],
    skills: [{ skill: "Astrogation" }],
    salary: 5_000,
    careers: ["scout/courier", "scout/explorer", "navy/flight", "merchant/free-trader", "ge-fleet-officer/navigator"],
    source: "HG p24",
  },
  {
    id: "engineer",
    name: "Engineer",
    stats: ["EDU", "INT"],
    skills: [
      { skill: "Engineer", spec: "j-drive" },
      { skill: "Engineer", spec: "m-drive" },
      { skill: "Engineer", spec: "power" },
    ],
    salary: 4_000,
    careers: ["navy/engineer-gunner", "merchant/merchant-marine", "scout/courier", "ge-fleet/engineer", "ge-slave/technician"],
    source: "HG p24",
    note: "Any of j-drive, m-drive or power, unless you pick one.",
    options: ["j-drive", "m-drive", "power", "life support"].map((spec) => ({ label: `Engineer (${spec})`, skills: [{ skill: "Engineer", spec }] })),
  },
  {
    id: "maintenance",
    name: "Maintenance",
    stats: ["EDU"],
    skills: [{ skill: "Mechanic" }],
    salary: 1_000,
    careers: ["navy/engineer-gunner", "merchant/merchant-marine", "army/support", "ge-slave/technician", "ge-fleet/crew"],
    source: "HG p24",
  },
  {
    id: "gunner",
    name: "Gunner",
    stats: ["DEX"],
    skills: [{ skill: "Gunner" }],
    salary: 2_000,
    careers: ["navy/engineer-gunner", "ge-fleet/gunner", "marine/star-marine", "rogue/pirate"],
    source: "HG p24",
    options: ["turret", "ortillery", "screen", "capital"].map((spec) => ({ label: `Gunner (${spec})`, skills: [{ skill: "Gunner", spec }] })),
  },
  {
    id: "sensor-operator",
    name: "Sensor operator",
    stats: ["INT", "EDU"],
    skills: [{ skill: "Electronics", spec: "sensors" }],
    salary: 4_000,
    careers: ["navy/line-crew", "scout/surveyor", "ge-fleet/crew", "agent/intelligence"],
    source: "HG p24",
  },
  {
    id: "steward",
    name: "Steward",
    stats: ["SOC", "EDU"],
    skills: [{ skill: "Steward" }],
    salary: 2_000,
    careers: ["merchant/merchant-marine", "merchant/free-trader", "navy/line-crew", "ge-slave/servant"],
    source: "HG p24",
  },
  {
    id: "medic",
    name: "Medic",
    stats: ["EDU", "INT"],
    skills: [{ skill: "Medic" }],
    salary: 4_000,
    careers: ["scholar/physician", "army/support", "marine/support", "ge-warrior/support"],
    source: "HG p24",
  },
  {
    id: "administrator",
    name: "Administrator",
    stats: ["EDU", "SOC"],
    skills: [{ skill: "Admin" }],
    salary: 1_500,
    careers: ["noble/administrator", "citizen/corporate", "merchant/broker", "agent/corporate"],
    source: "HG p24",
  },
  {
    id: "officer",
    name: "Officer",
    stats: ["SOC", "INT"],
    skills: [{ skill: "Leadership" }, { skill: "Persuade" }],
    salary: 5_000,
    careers: ["navy/line-crew", "marine/star-marine", "army/infantry", "ge-fleet-officer/commander", "ge-warrior-officer/leader"],
    source: "HG p24",
  },
  {
    id: "marine",
    name: "Marine",
    stats: ["DEX", "STR", "END"],
    skills: [{ skill: "Gun Combat" }, { skill: "Melee" }],
    salary: 1_000,
    careers: ["marine/star-marine", "marine/ground-assault", "army/infantry", "ge-warrior/imperial-guard", "ge-slave/dog-soldier"],
    source: "CRB p154",
    options: ["archaic", "energy", "slug"].map((spec) => ({ label: `Gun Combat (${spec})`, skills: [{ skill: "Gun Combat", spec }] })),
  },
  {
    id: "scientist",
    name: "Scientist",
    stats: ["EDU", "INT"],
    skills: [{ skill: "Science" }],
    salary: 0,
    careers: ["scholar/scientist", "scholar/field-researcher", "scout/surveyor"],
    source: "HG p61",
    note: "On a laboratory ship. The crew table gives no salary.",
    options: SCIENCES.map((spec) => ({ label: `Science (${spec})`, skills: [{ skill: "Science", spec }] })),
  },
  {
    id: "small-craft-crew",
    name: "Small craft crew",
    stats: ["DEX"],
    skills: [
      { skill: "Pilot", spec: "small craft" },
      { skill: "Gunner", spec: "turret" },
    ],
    salary: 0,
    careers: ["navy/flight", "navy/engineer-gunner", "ge-fleet/pilot", "ge-fleet/gunner"],
    source: "HG ship sheets",
    note: "Crews for the small craft and fighters a ship carries. The crew table gives no salary.",
  },
  // One person doing two jobs, as on some High Guard ships: both skills at the level, the higher salary.
  {
    id: "pilot-astrogator",
    name: "Pilot/Astrogator",
    stats: ["DEX", "EDU"],
    skills: [{ skill: "Pilot", spec: "spacecraft" }],
    also: [[{ skill: "Astrogation" }]],
    salary: 6_000,
    careers: ["scout/courier", "navy/flight", "merchant/free-trader"],
    source: "HG ship sheets",
    note: "One person, both jobs.",
  },
  {
    id: "astrogator-engineer",
    name: "Astrogator/Engineer",
    stats: ["EDU", "INT"],
    skills: [{ skill: "Astrogation" }],
    also: [
      [
        { skill: "Engineer", spec: "j-drive" },
        { skill: "Engineer", spec: "m-drive" },
        { skill: "Engineer", spec: "power" },
      ],
    ],
    salary: 5_000,
    careers: ["scout/courier", "scout/explorer", "merchant/free-trader"],
    source: "HG ship sheets",
    note: "One person, both jobs.",
  },
  {
    id: "captain-pilot",
    name: "Captain/Pilot",
    stats: ["SOC", "DEX"],
    skills: [{ skill: "Leadership" }, { skill: "Tactics", spec: "naval" }, { skill: "Broker" }, { skill: "Admin" }],
    also: [[{ skill: "Pilot", spec: "spacecraft" }]],
    salary: 10_000,
    careers: ["navy/flight", "scout/courier", "merchant/free-trader"],
    source: "HG ship sheets",
    note: "One person, both jobs.",
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

/**
 * A service whose ships the crew serves on: every member must be serving in
 * it when creation ends, so has its rank. CharSpec 12.6.
 */
export interface CrewService {
  id: string;
  name: string;
  setting: "core" | "glorious-empire";
  /** The careers that count as the service. */
  careers: string[];
  /** The service's own troops fill the Marine post, if they are another career, and what they are called. */
  marines?: string[];
  marinesName?: string;
  /** Captains and officers come from these careers, if the service has separate officer careers. */
  officers?: string[];
  /** Who serves, when the crew's species is left mixed: the Aslan services take no human slaves. */
  species?: string[];
}

export const CREW_SERVICES: CrewService[] = [
  { id: "navy", name: "Navy", setting: "core", careers: ["navy"], marines: ["marine"], marinesName: "Marines" },
  { id: "marine", name: "Marines", setting: "core", careers: ["marine"] },
  { id: "scout", name: "Scout Service", setting: "core", careers: ["scout"] },
  { id: "army", name: "Army", setting: "core", careers: ["army"] },
  { id: "merchant", name: "Merchant", setting: "core", careers: ["merchant"] },
  { id: "ge-fleet", name: "Aslan Fleet", setting: "glorious-empire", careers: ["ge-fleet", "ge-fleet-officer"], marines: ["ge-warrior", "ge-warrior-officer"], marinesName: "Aslan Warriors", officers: ["ge-fleet-officer"], species: ["ge-aslan"] },
  { id: "ge-warrior", name: "Aslan Warriors", setting: "glorious-empire", careers: ["ge-warrior", "ge-warrior-officer"], officers: ["ge-warrior-officer"], species: ["ge-aslan"] },
];

/** Posts a service fills with commissioned officers. */
export const OFFICER_POSTS = ["captain", "officer", "captain-pilot"];

export interface ServiceNeed {
  service: string;
  /** Careers that count for this post. */
  careers: string[];
  /** The post needs a commission (in a career that has them). */
  commissioned: boolean;
  /** The lowest rank that will do, on the post's own ladder: an officer rank where a commission is needed, else an enlisted rank. */
  minRank: number;
}

/** What serving in `s` means for post `p`: which careers count, whether a commission is needed, and the lowest rank. */
export function serviceNeed(s: CrewService, p: CrewPosition, minRank = 0): ServiceNeed {
  if (p.id === "marine" && s.marines) return { service: s.marinesName ?? s.name, careers: s.marines, commissioned: false, minRank };
  if (OFFICER_POSTS.includes(p.id)) return s.officers ? { service: s.name, careers: s.officers, commissioned: false, minRank } : { service: s.name, careers: s.careers, commissioned: true, minRank };
  return { service: s.name, careers: s.careers, commissioned: false, minRank };
}

/** Labels for ranks 0 to 6 in the need's first career: "O3 Lieutenant", "2 Corporal". Rank 0 is "any". */
export function rankLabels(need: ServiceNeed): string[] {
  const c = hasCareer(need.careers[0]!) ? findCareer(need.careers[0]!) : undefined;
  const table = c?.ranks.find((rt) => !!rt.officer === need.commissioned) ?? c?.ranks[0];
  return [0, 1, 2, 3, 4, 5, 6].map((i) => {
    if (i === 0) return "any";
    const title = table?.ranks[i]?.title;
    return `${need.commissioned ? "O" : ""}${i}${title ? ` ${title}` : ""}`;
  });
}

export function findService(id: string): CrewService | undefined {
  return CREW_SERVICES.find((x) => x.id === id);
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
