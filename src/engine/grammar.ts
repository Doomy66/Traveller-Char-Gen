import { findSkill } from "../rules/skills";
import type { BenefitText, CheckText, GainText, Stat } from "../rules/types";

/**
 * The three small text grammars the rules data is written in (CharSpec 3.2 to
 * 3.4). Parsing is strict: anything unrecognised throws, and a test parses
 * every string in every table.
 */

export type Tag = "male" | "female" | "slave" | "aslan" | "human";

export type Gain = (
  | { k: "none" }
  /** level undefined: +1. spec "any" or specChoices: the player picks. */
  | { k: "skill"; name: string; spec?: string; specChoices?: string[]; level?: number }
  /** delta: change by; atLeast: raise to at least. */
  | { k: "stat"; stat: Stat; delta?: number; atLeast?: number }
  /** `dice` set: the count is rolled ("1D Ship Shares"). */
  | { k: "shares"; kind: "ship" | "clan"; n: number; dice?: "1D" | "2D" }
  | { k: "cash"; amount: number }
  | { k: "talent"; level?: number }
  | { k: "anySkill"; level?: number }
  | { k: "benefit"; name: string }
  | { k: "choice"; options: Gain[] }
  | { k: "all"; items: Gain[] }
) & { tags?: Tag[] };

const STATS: Stat[] = ["STR", "DEX", "END", "INT", "EDU", "SOC", "PSI", "TER"];
const WORD_NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };

/** Benefit names a career's Other column may use (CRB p47, GE p59). */
export const BENEFIT_NAMES = [
  "Scientific Equipment",
  "Weapon",
  "Gun",
  "Blade",
  "Armour",
  "Cybernetic Implant",
  "Combat Implant",
  "Augmentation",
  "TAS Membership",
  "Contact",
  "Ally",
  "Personal Vehicle",
  "Free Trader",
  "Lab Ship",
  "Yacht",
  "Scout Ship",
  "Ship's Boat",
  "Brotherhood of the Empire",
  "Courier",
  "Transport",
  "External or Aslan Ally",
  "Freedom",
  "Secret School",
  "Aslan Contact",
];
const BENEFIT_BY_LOWER = new Map(BENEFIT_NAMES.map((n) => [n.toLowerCase(), n]));

/** Split on a separator only at the top level, outside () and []. */
function splitTop(s: string, sep: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0) {
      sep.lastIndex = 0;
      const m = sep.exec(s.slice(i));
      if (m && m.index === 0) {
        out.push(s.slice(start, i));
        i += m[0].length - 1;
        start = i + 1;
      }
    }
  }
  out.push(s.slice(start));
  return out.map((p) => p.trim()).filter((p) => p !== "");
}

function hasTop(s: string, word: string): boolean {
  return splitTop(s, new RegExp(`^ ${word} `)).length > 1;
}

function stripTags(s: string): { body: string; tags?: Tag[] } {
  const m = /^(.*?)\s*\[([a-z, ]+)\]$/.exec(s);
  if (!m) return { body: s };
  const tags = m[2]!.split(",").map((t) => t.trim()) as Tag[];
  for (const t of tags) if (!["male", "female", "slave", "aslan", "human"].includes(t)) throw new Error(`Unknown tag "${t}"`);
  return { body: m[1]!.trim(), tags };
}

/** Parse one skill name with optional speciality and level: "Gun Combat (slug) 1". */
export function parseSkillRef(s: string): { name: string; spec?: string; specChoices?: string[]; level?: number } | undefined {
  const m = /^(.+?)(?:\s*\(([^)]+)\))?(?:\s+(\d))?$/.exec(s.trim());
  if (!m) return undefined;
  const def = findSkill(m[1]!);
  if (!def) return undefined;
  const out: { name: string; spec?: string; specChoices?: string[]; level?: number } = { name: def.name };
  if (m[3] !== undefined) out.level = Number(m[3]);
  const spec = m[2]?.trim();
  if (spec !== undefined) {
    if (/ or /.test(spec)) {
      out.specChoices = spec.split(/,| or /).map((x) => x.trim()).filter(Boolean);
    } else if (spec.toLowerCase() === "any") {
      out.spec = "any";
    } else {
      out.spec = spec;
    }
  }
  return out;
}

function parseAtom(raw: string, allowBenefits: boolean): Gain {
  const { body, tags } = stripTags(raw.trim());
  const s = body.trim();
  const g = parseAtomBody(s, allowBenefits);
  return tags ? { ...g, tags } : g;
}

function parseAtomBody(s: string, allowBenefits: boolean): Gain {
  if (s === "" || s === "--" || s === "-" || s.toLowerCase() === "none") return { k: "none" };
  let m = /^Cr\s?([\d,]+)$/i.exec(s);
  if (m) return { k: "cash", amount: Number(m[1]!.replace(/,/g, "")) };
  m = /^([12]D)\s*(Ship|Clan) Shares?$/i.exec(s);
  if (m) return { k: "shares", kind: m[2]!.toLowerCase() === "ship" ? "ship" : "clan", n: 0, dice: m[1]!.toUpperCase() as "1D" | "2D" };
  m = /^(\d+|one|two|three|four|five|ten)?\s*(Ship|Clan) Shares?$/i.exec(s);
  if (m) {
    const n = m[1] === undefined ? 1 : /\d/.test(m[1]) ? Number(m[1]) : WORD_NUMBERS[m[1].toLowerCase()]!;
    return { k: "shares", kind: m[2]!.toLowerCase() === "ship" ? "ship" : "clan", n };
  }
  m = /^(STR|DEX|END|INT|EDU|SOC|PSI|TER)\s*([+-])\s*(\d+)$/.exec(s);
  if (m) return { k: "stat", stat: m[1] as Stat, delta: (m[2] === "-" ? -1 : 1) * Number(m[3]) };
  m = /^(STR|DEX|END|INT|EDU|SOC|PSI|TER)\s+(\d+)$/.exec(s);
  if (m) return { k: "stat", stat: m[1] as Stat, atLeast: Number(m[2]) };
  m = /^Any Talent(?: skill)?(?:\s+(\d))?$/i.exec(s);
  if (m) return m[1] === undefined ? { k: "talent" } : { k: "talent", level: Number(m[1]) };
  m = /^Any skill(?:\s+(\d))?$/i.exec(s);
  if (m) return m[1] === undefined ? { k: "anySkill" } : { k: "anySkill", level: Number(m[1]) };
  if (allowBenefits) {
    const b = BENEFIT_BY_LOWER.get(s.toLowerCase());
    if (b) return { k: "benefit", name: b };
  }
  const sk = parseSkillRef(s);
  if (sk) return { k: "skill", ...sk };
  throw new Error(`Cannot parse "${s}"`);
}

function parseList(text: string, allowBenefits: boolean): Gain {
  const s = text.trim();
  if (allowBenefits && BENEFIT_BY_LOWER.has(s.toLowerCase())) return { k: "benefit", name: BENEFIT_BY_LOWER.get(s.toLowerCase())! };
  if (hasTop(s, "and")) {
    const items = splitTop(s, /^(,| and )/).map((p) => parseList(p, allowBenefits));
    return { k: "all", items };
  }
  if (hasTop(s, "or")) {
    const options = splitTop(s, /^(,| or )/).map((p) => parseAtom(p, allowBenefits));
    return { k: "choice", options };
  }
  return parseAtom(s, allowBenefits);
}

const gainCache = new Map<string, Gain>();
export function parseGain(text: GainText): Gain {
  let g = gainCache.get(text);
  if (!g) {
    g = parseList(text, false);
    gainCache.set(text, g);
  }
  return g;
}

const benefitCache = new Map<string, Gain>();
export function parseBenefit(text: BenefitText): Gain {
  let g = benefitCache.get(text);
  if (!g) {
    g = parseList(text, true);
    benefitCache.set(text, g);
  }
  return g;
}

/** One way to make a check: a characteristic, a skill, the Aslan rite score, or plain dice. */
export type CheckOption =
  | { kind: "stat"; stat: Stat; target: number }
  | { kind: "skill"; name: string; spec?: string; target: number }
  | { kind: "rite"; target: number }
  | { kind: "plain"; target: number };

/** Parse "INT 6+", "DEX or INT 5+", "Investigate 8+ or Streetwise 8+", "8+". */
export function parseCheck(text: CheckText): CheckOption[] {
  const parts = splitTop(text.trim(), /^(,| or )/);
  const raw = parts.map((p) => {
    const m = /^(.*?)\s*(\d+)\+$/.exec(p);
    return m ? { what: m[1]!.trim(), target: Number(m[2]) } : { what: p.trim(), target: undefined as number | undefined };
  });
  const last = raw[raw.length - 1]?.target;
  if (last === undefined) throw new Error(`Check without a target: "${text}"`);
  let carry = last;
  for (let i = raw.length - 1; i >= 0; i--) {
    if (raw[i]!.target === undefined) raw[i]!.target = carry;
    else carry = raw[i]!.target!;
  }
  return raw.map(({ what, target }): CheckOption => {
    const t = target!;
    if (what === "") return { kind: "plain", target: t };
    if ((STATS as string[]).includes(what)) return { kind: "stat", stat: what as Stat, target: t };
    if (/^rite( of passage)?$/i.test(what)) return { kind: "rite", target: t };
    const sk = parseSkillRef(what);
    if (sk) return sk.spec && sk.spec !== "any" ? { kind: "skill", name: sk.name, spec: sk.spec, target: t } : { kind: "skill", name: sk.name, target: t };
    throw new Error(`Cannot parse check "${text}" (part "${what}")`);
  });
}

/** A readable form of a gain, for buttons and the history. */
export function describeGain(g: Gain): string {
  switch (g.k) {
    case "none":
      return "nothing";
    case "skill": {
      const spec = g.specChoices ? ` (${g.specChoices.join(" or ")})` : g.spec ? ` (${g.spec})` : "";
      return `${g.name}${spec}${g.level !== undefined ? ` ${g.level}` : ""}`;
    }
    case "stat":
      return g.atLeast !== undefined ? `${g.stat} ${g.atLeast}` : `${g.stat} ${g.delta! >= 0 ? "+" : ""}${g.delta}`;
    case "shares":
      if (g.dice) return `${g.dice} ${g.kind === "ship" ? "Ship" : "Clan"} Shares`;
      return `${g.n} ${g.kind === "ship" ? "Ship" : "Clan"} Share${g.n === 1 ? "" : "s"}`;
    case "cash":
      return `Cr${g.amount.toLocaleString("en-GB")}`;
    case "talent":
      return `Any psionic talent${g.level !== undefined ? ` ${g.level}` : ""}`;
    case "anySkill":
      return `Any skill${g.level !== undefined ? ` ${g.level}` : ""}`;
    case "benefit":
      return g.name;
    case "choice":
      return g.options.map(describeGain).join(" or ");
    case "all":
      return g.items.map(describeGain).join(" and ");
  }
}
