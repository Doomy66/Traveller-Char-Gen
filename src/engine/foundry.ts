import { CAREERS } from "../rules/careers/index";
import { SKILLS, type SkillDef } from "../rules/skills";
import { SPECIES } from "../rules/species";
import type { AssociateKind, Stat } from "../rules/types";
import { emptyTraveller, type CareerRecord, type Gender, type Possession, type Traveller } from "./character";

/**
 * Reading a character exported from Foundry VTT's Mongoose Traveller 2e
 * system (system id "mgt2e"; right-click an actor, Export Data). The file
 * holds the finished character, not how it was made, so it comes in as a
 * finished sheet: characteristics, skills, careers rebuilt from its term
 * records, associates, gear and money. CharSpec 13.
 *
 * The layout followed is the system's own template.json and actor code: a
 * skill counts only when `trained` is set, and then its level is `value`, or
 * each speciality's `value`.
 */

export interface FoundryImport {
  t: Traveller;
  /** What could not be brought across, or was guessed. */
  warnings: string[];
}

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === "object" && x !== null && !Array.isArray(x);
const obj = (x: unknown): Obj => (isObj(x) ? x : {});
const num = (x: unknown): number | undefined => {
  const n = typeof x === "number" ? x : typeof x === "string" && x.trim() !== "" ? Number(x.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) ? n : undefined;
};
const str = (x: unknown): string => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");
/** Letters and digits only, lower case: "Jack-of-all-Trades" and "jackofalltrades" meet. */
const key = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** "remoteOps" to "remote ops". */
const words = (id: string): string => id.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
const plain = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** The actor in a file: a bare actor, or one wrapped as [actor] or {actor}. */
function actorOf(data: unknown): Obj | undefined {
  if (Array.isArray(data)) data = data[0];
  if (isObj(data) && isObj(data.actor)) data = data.actor;
  return isObj(data) ? data : undefined;
}

/** Whether parsed JSON looks like a Foundry Mongoose Traveller character. */
export function isFoundryActor(data: unknown): boolean {
  const a = actorOf(data);
  if (!a) return false;
  const sys = obj(a.system ?? a.data);
  return (a.type === "traveller" || a.type === "npc") && isObj(sys.characteristics) && isObj(sys.skills);
}

/** Foundry's speciality ids that are not simply our names run together. */
const SPEC_FIXES: Record<string, string> = { vetinary: "veterinary", linquistics: "linguistics" };

function skillDef(id: string, label: string): SkillDef | undefined {
  return SKILLS.find((s) => key(s.name) === key(id)) ?? (label ? SKILLS.find((s) => key(s.name) === key(label)) : undefined);
}

function specName(def: SkillDef | undefined, id: string, label: string): string {
  const fixed = SPEC_FIXES[id] ?? words(id);
  const known = def?.specialities?.find((s) => key(s) === key(fixed) || (label && key(s) === key(label)));
  if (known) return known;
  // Not one of ours: the label as given, or the id spelt out; languages keep their capital.
  const name = label || fixed;
  return def?.name === "Language" ? name.charAt(0).toUpperCase() + name.slice(1) : name.toLowerCase();
}

function readSkills(skills: Obj, t: Traveller, warnings: string[]): void {
  for (const [id, raw] of Object.entries(skills)) {
    const e = obj(raw);
    const base = num(e.value);
    // The system's own flag; files from elsewhere sometimes leave it out, and then a level of 0 or more counts.
    const trained = e.trained === true || (e.trained === undefined && base !== undefined && base >= 0);
    if (!trained) continue;
    const label = str(e.label);
    const def = skillDef(id, label);
    const name = def?.name ?? (label || words(id).replace(/^\w/, (c) => c.toUpperCase()));
    if (!def) warnings.push(`${name} is not a Core Rulebook skill; kept as written.`);
    const state = (t.skills[name] ??= { level: 0, specs: {} });
    const specs = obj(e.specialities ?? e.specialties);
    let anySpec = false;
    for (const [sid, sraw] of Object.entries(specs)) {
      const s = obj(sraw);
      const lv = num(s.value) ?? 0;
      // Specialities ride on the parent's training; a level above 0 is what the sheet shows.
      // Profession specialities are learnt one by one, so a trained one at 0 is kept too.
      if (!(lv > 0 || (s.trained === true && def?.name === "Profession"))) continue;
      state.specs[specName(def, sid, str(s.label))] = Math.max(0, lv);
      anySpec = true;
    }
    const b = Math.max(0, base ?? 0);
    if (def?.specialities && b > 0 && !anySpec) warnings.push(`${name} ${b} has no speciality in the file; shown at ${b} without one.`);
    state.level = def?.specialities && anySpec ? 0 : b;
  }
}

function speciesOf(text: string): { id: string; note?: string } {
  const k = key(text);
  if (!k) return { id: "human" };
  const exact = SPECIES.find((s) => key(s.name) === k || key(s.id) === k);
  if (exact) return { id: exact.id };
  if (k.includes("aslan")) return { id: "aslan", note: text };
  if (k.includes("vargr")) return { id: "vargr", note: text };
  return { id: "human", note: k === "human" ? undefined : text };
}

function genderOf(text: string): Gender {
  const k = text.trim().toLowerCase();
  if (/^(f|female|woman)$/.test(k)) return "female";
  if (/^(m|male|man)$/.test(k)) return "male";
  return "other";
}

/** A career named in a term's text, with the assignment and rank title if they can be found. */
interface TermGuess {
  careerId: string;
  known: boolean;
  assignmentId: string;
  rank: number;
  officer: boolean;
}

function guessTerm(text: string): TermGuess {
  const s = text.replace(/^Term\s*\d+\s*[:.-]?\s*/i, "").trim();
  const rankTitle = /\(([^()]*)\)\s*$/.exec(s)?.[1]?.trim() ?? "";
  const body = rankTitle ? s.slice(0, s.lastIndexOf("(")).trim() : s;
  const k = key(body);
  // The longest career name found in the text wins, so "Merchant Marine" reads as Merchant, not Marine.
  const career = [...CAREERS].sort((a, b) => b.name.length - a.name.length).find((c) => k.includes(key(c.name)));
  if (!career) {
    const name = body.split(/[:\-–—/,]/)[0]!.trim() || "Unknown career";
    return { careerId: name, known: false, assignmentId: "", rank: 0, officer: false };
  }
  const rest = k.replace(key(career.name), "");
  const asg = career.assignments.find((a) => rest.includes(key(a.name))) ?? career.assignments.find((a) => k.includes(key(a.name)));
  let rank = 0;
  let officer = false;
  if (rankTitle) {
    const rk = key(rankTitle);
    for (const table of career.ranks) {
      const i = table.ranks.findIndex((r) => r.title && key(r.title) === rk);
      if (i >= 0) {
        rank = i;
        officer = !!table.officer;
        break;
      }
    }
    if (!rank) {
      const n = /\b(?:rank\s*)?(O)?(\d)\b/i.exec(rankTitle);
      if (n) {
        rank = Number(n[2]);
        officer = !!n[1];
      }
    }
  }
  return { careerId: career.id, known: true, assignmentId: asg?.id ?? career.assignments[0]?.id ?? "", rank, officer };
}

function record(g: TermGuess): CareerRecord {
  return {
    careerId: g.careerId,
    assignmentId: g.assignmentId,
    assignments: g.assignmentId ? [g.assignmentId] : [],
    terms: 0,
    rank: g.rank,
    officer: g.officer,
    highestRank: g.rank,
    benefitRolls: 0,
    benefitDMs: [],
    benefitDMAll: 0,
    survivalDM: 0,
    ended: true,
    mustered: true,
  };
}

const ASSOCIATE_KINDS: AssociateKind[] = ["contact", "ally", "rival", "enemy"];

/** Read a Foundry VTT Mongoose Traveller 2e actor. Throws if the file is not one. */
export function fromFoundry(data: unknown): FoundryImport {
  const a = actorOf(data);
  if (!a || !isFoundryActor(a)) throw new Error("Not a Foundry VTT Mongoose Traveller character (system mgt2e, a Traveller or NPC actor).");
  const sys = obj(a.system ?? a.data);
  const warnings: string[] = [];
  const t = emptyTraveller();
  t.name = str(a.name).trim();
  t.finished = true;

  // Characteristics: `value` is the score; `current` is after damage.
  const chars = obj(sys.characteristics);
  for (const s of ["STR", "DEX", "END", "INT", "EDU", "SOC"] as Stat[]) {
    const v = num(obj(chars[s]).value);
    if (v !== undefined) t.stats[s] = v;
    else warnings.push(`No ${s} in the file.`);
  }
  const psi = obj(chars.PSI);
  const psiValue = num(psi.value);
  if (psiValue !== undefined && (psiValue > 0 || psi.show === true)) {
    t.stats.PSI = psiValue;
    t.psiTested = true;
    t.psionAllowed = true;
  }
  t.initialStats = { ...t.stats };

  readSkills(obj(sys.skills), t, warnings);

  // Who they are.
  const soph = obj(sys.sophont);
  const sp = speciesOf(str(soph.species));
  t.speciesId = sp.id;
  t.gender = genderOf(str(soph.gender));
  t.homeworld = str(soph.homeworld).trim();
  t.age = num(soph.age) ?? num(sys.entryAge) ?? 18;
  const notes: string[] = [];
  if (sp.note) notes.push(`Species in Foundry: ${sp.note}.`);
  const profession = str(soph.profession).trim();

  // Money.
  const fin = obj(sys.finance);
  t.cash = num(fin.cash) ?? 0;
  t.pension = num(fin.pension) ?? 0;
  t.debt = num(fin.medicalDebt) ?? 0;
  t.shipShares = num(fin.shipShares) ?? 0;
  const mortgage = num(fin.mortgage) ?? 0;
  if (mortgage) notes.push(`Mortgage: Cr${mortgage.toLocaleString("en-GB")} a month.`);
  const finNote = plain(str(fin.description));
  if (finNote) notes.push(finNote);

  // Items: terms, associates and gear.
  const items = (Array.isArray(a.items) ? a.items : []).filter(isObj);
  const terms = items
    .filter((i) => i.type === "term")
    .map((i, n) => {
      const s = obj(i.system ?? i.data);
      const term = obj(s.term);
      return { n: num(term.number) ?? n + 1, text: str(term.assignment) || str(i.name), length: num(term.termLength) ?? 4, description: plain(str(s.description)) };
    })
    .sort((x, y) => x.n - y.n);
  let unknownCareer = false;
  for (const term of terms) {
    const g = guessTerm(term.text);
    if (!g.known) unknownCareer = true;
    const last = t.careers[t.careers.length - 1];
    const rec = last && last.careerId === g.careerId ? last : (t.careers.push(record(g)), t.careers[t.careers.length - 1]!);
    rec.terms++;
    if (g.assignmentId && !rec.assignments.includes(g.assignmentId)) rec.assignments.push(g.assignmentId);
    if (g.assignmentId) rec.assignmentId = g.assignmentId;
    if (g.rank > rec.rank || (g.officer && !rec.officer)) {
      rec.rank = g.rank;
      rec.officer = g.officer;
    }
    rec.highestRank = Math.max(rec.highestRank, rec.rank);
    t.terms++;
    const age = 18 + (t.terms - 1) * term.length;
    t.history.push({ term: t.terms, age, text: `Term ${t.terms}: ${term.text}`, kind: "career" });
    if (term.description && term.description !== term.text) t.history.push({ term: t.terms, age, text: term.description, kind: "event" });
  }
  t.terms = Math.max(t.terms, num(sys.terms) ?? 0);
  if (unknownCareer) warnings.push("A term names a career this generator does not know; it is shown as written.");
  if (!terms.length && profession) notes.push(`Profession: ${profession}.`);
  if (!terms.length && t.terms) warnings.push(`The file says ${t.terms} terms but lists no careers.`);

  for (const i of items) {
    const s = obj(i.system ?? i.data);
    const name = str(i.name).trim() || "Item";
    if (i.type === "associate") {
      const rel = str(obj(s.associate).relationship || s.relation).toLowerCase();
      const kind = ASSOCIATE_KINDS.find((k) => k === rel) ?? "contact";
      const desc = plain(str(s.description));
      t.associates.push({ kind, note: desc && desc !== name ? `${name}: ${desc}` : name, origin: "Foundry VTT" });
      continue;
    }
    if (!["item", "weapon", "armour", "augment", "software", "cargo"].includes(str(i.type))) continue;
    if (s.status === "destroyed") continue;
    const qty = num(s.quantity) ?? 1;
    const p: Possession = { name: qty > 1 ? `${name} ×${qty}` : name, source: "Foundry VTT" };
    const detail: string[] = [];
    const tl = num(s.tl);
    if (tl) detail.push(`TL${tl}`);
    if (i.type === "weapon") {
      const w = obj(s.weapon);
      if (str(w.damage)) detail.push(`${str(w.damage)} damage`);
      const range = num(w.range);
      if (range) detail.push(`range ${range}m`);
      if (str(w.traits)) detail.push(str(w.traits));
      const fqn = str(w.skill);
      if (fqn) {
        const [sid, spid] = fqn.split(".");
        const def = skillDef(sid ?? "", "");
        if (def) p.skill = spid ? `${def.name} (${specName(def, spid, "")})` : def.name;
      }
    }
    if (i.type === "armour") {
      const prot = num(obj(s.armour).protection);
      if (prot) detail.push(`Protection +${prot}`);
    }
    if (detail.length) p.detail = detail.join(", ");
    const cost = num(s.cost);
    if (cost) p.cost = cost;
    t.possessions.push(p);
  }

  const bio = plain(str(sys.description));
  if (bio) notes.push(bio);
  t.notes = notes.join("\n\n");
  t.history.unshift({ term: 0, age: 18, text: "Imported from a Foundry VTT (Mongoose Traveller 2e) character. How the character was made is not in the file.", kind: "info" });
  return { t, warnings };
}
