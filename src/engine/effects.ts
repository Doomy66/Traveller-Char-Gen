import { findCareer, hasCareer, tablesFor } from "../rules/careers/index";
import { anySkillNames, findSkill, hasSpecialities, PSIONIC_TALENTS, SKILLS } from "../rules/skills";
import {
  characteristicDM,
  INJURY,
  LIFE_EVENTS,
  medicalCover,
  PAROLE,
  PSIONIC_TRAINING,
  PSIONICS,
  RESTORE_COST_PER_POINT,
  warDraftCareer,
} from "../rules/tables";
import { findSpecies } from "../rules/species";
import type { Amount, AssociateKind, Career, Effect, SkillTableDef, Stat, TableRow } from "../rules/types";
import { PHYSICAL } from "../rules/types";
import {
  dm,
  raiseSkill,
  setSkill,
  skillLevel,
  stat,
  type CareerRecord,
  type SkillChange,
  type Traveller,
} from "./character";
import type { Ctx, Option } from "./context";
import { describeGain, parseCheck, parseGain, type CheckOption, type Gain, type Tag } from "./grammar";

/**
 * Applying the rules data to a Traveller: checks, skill gains, effects,
 * injuries. CharSpec 6.
 */

/** What happened in the current term, collected as effects are applied. */
export interface TermState {
  /** Ejected from the career by a mishap. */
  ejected: boolean;
  /** Leaves at the end of the term without a mishap (keeps the benefit). */
  leave: boolean;
  mustContinue: boolean;
  benefitLost: boolean;
  keepBenefit: boolean;
  promote: boolean;
  promoteOrCommission: boolean;
  noGraduate: boolean;
  mishap: boolean;
  /** Skills raised this term (for the pre-career tutor event). */
  skillsGained: string[];
}

export function newTermState(): TermState {
  return {
    ejected: false,
    leave: false,
    mustContinue: false,
    benefitLost: false,
    keepBenefit: false,
    promote: false,
    promoteOrCommission: false,
    noGraduate: false,
    mishap: false,
    skillsGained: [],
  };
}

/** Where effects are being applied. */
export interface Env {
  career?: Career;
  rec?: CareerRecord;
  term: TermState;
  /** Set by a {t:"stay"} effect inside a mishap. */
  stay?: boolean;
  /** Short label for associates' notes. */
  where: string;
  /** What just happened, in words: the prompt for an untitled choice. */
  context?: string;
}

const fmt = (n: number) => `Cr${n.toLocaleString("en-GB")}`;
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

// ---------------------------------------------------------------- tags

export function travellerTags(t: Traveller): Tag[] {
  const tags: Tag[] = [];
  if (t.gender === "male") tags.push("male");
  if (t.gender === "female") tags.push("female");
  if (t.slave) tags.push("slave");
  if (t.speciesId.includes("aslan")) tags.push("aslan");
  else tags.push("human");
  return tags;
}

function tagOk(t: Traveller, g: Gain): boolean {
  if (!g.tags) return true;
  const mine = travellerTags(t);
  // A slave's tags win over gender: "Admin [female,slave]" is for any slave.
  return g.tags.some((x) => mine.includes(x)) && !(t.slave && g.tags.every((x) => x !== "slave") && g.tags.some((x) => x === "male" || x === "female") && mine.includes("slave") && g.tags.length > 0 && hasSlaveAlternative);
}
// Set per call by applyGain when a sibling option is tagged for slaves.
let hasSlaveAlternative = false;

// ---------------------------------------------------------------- checks

export interface CheckResult {
  pass: boolean;
  total: number;
  natural: number;
  option: CheckOption;
  mod: number;
}

/** The modifier a Traveller brings to one way of making a check. During creation it is the characteristic DM or the skill level, never both (CRB p11). */
export function checkModifier(t: Traveller, o: CheckOption): number {
  switch (o.kind) {
    case "plain":
      return 0;
    case "rite":
      return t.rite === undefined ? 0 : characteristicDM(t.rite);
    case "stat":
      if (o.stat === "PSI" && t.stats.PSI === undefined) return -3;
      return dm(t, o.stat);
    case "skill": {
      const lv = skillLevel(t, o.name, o.spec);
      if (lv !== undefined) return lv;
      const jack = skillLevel(t, "Jack-of-all-Trades") ?? 0;
      return Math.min(0, -3 + jack);
    }
  }
}

function optionLabel(o: CheckOption): string {
  switch (o.kind) {
    case "plain":
      return `${o.target}+`;
    case "rite":
      return `Rite ${o.target}+`;
    case "stat":
      return `${o.stat} ${o.target}+`;
    case "skill":
      return `${o.name}${o.spec ? ` (${o.spec})` : ""} ${o.target}+`;
  }
}

/**
 * Roll a check. Where the check offers several ways (DEX or INT), the best for
 * this Traveller is used. A natural 2 always fails when `natural2Fails`.
 */
export async function check(
  ctx: Ctx,
  text: string,
  label: string,
  extraDM = 0,
  o: { natural2Fails?: boolean; quiet?: boolean } = {},
): Promise<CheckResult> {
  const opts = parseCheck(text);
  let best = opts[0]!;
  let bestNet = -Infinity;
  for (const op of opts) {
    const net = checkModifier(ctx.t, op) - op.target;
    if (net > bestNet) {
      bestNet = net;
      best = op;
    }
  }
  const mod = checkModifier(ctx.t, best) + extraDM;
  const r = await ctx.roll("2D", `${label}: ${optionLabel(best)}`);
  const total = r.total + mod;
  let pass = total >= best.target;
  if (o.natural2Fails && r.total === 2) pass = false;
  if (!o.quiet) {
    ctx.log(`${label}: ${optionLabel(best)}, rolled ${r.total}${mod !== 0 ? ` ${sign(mod)} = ${total}` : ""}: ${pass ? "success" : "failure"}.`, "roll");
  }
  return { pass, total, natural: r.total, option: best, mod };
}

export async function rollAmount(ctx: Ctx, a: Amount | undefined, label: string): Promise<number> {
  if (a === undefined) return 1;
  if (typeof a === "number") return a;
  return (await ctx.roll(a, label)).total;
}

// ---------------------------------------------------------------- skills

/** Which speciality? Asks when it matters. `level` 0 needs none. */
async function pickSpec(ctx: Ctx, name: string, g: { spec?: string; specChoices?: string[] }, level: number | undefined): Promise<string | undefined> {
  if (!hasSpecialities(name)) return undefined;
  if (level === 0) return undefined;
  if (g.spec && g.spec !== "any") return g.spec;
  const def = findSkill(name)!;
  const list = g.specChoices ?? def.specialities ?? [];
  const held = ctx.t.skills[name]?.specs ?? {};
  const opts: Option<string>[] = list.map((s) => ({
    label: `${name} (${s})`,
    value: s,
    ...(held[s] !== undefined ? { detail: `now ${held[s]}` } : {}),
  }));
  // Suggest raising the speciality already highest, as most players would.
  let hint = 0;
  let bestHeld = -1;
  list.forEach((s, i) => {
    if ((held[s] ?? -1) > bestHeld && (held[s] ?? -1) < 4) {
      bestHeld = held[s]!;
      hint = i;
    }
  });
  return ctx.one(`Which speciality of ${name}?`, opts, { hint });
}

function reportSkill(ctx: Ctx, env: Env | undefined, name: string, spec: string | undefined, r: SkillChange): void {
  const full = spec ? `${name} (${spec})` : name;
  if (r.ok) {
    ctx.log(`${full} ${r.to}.`, "skill");
    env?.term.skillsGained.push(name);
  } else ctx.log(`${full}: no gain (${r.reason}).`, "skill");
}

/** Raise a skill (+1) or set it to a level, asking for a speciality where needed. */
export async function gainSkill(
  ctx: Ctx,
  env: Env | undefined,
  name: string,
  o: { spec?: string; specChoices?: string[]; level?: number; limit?: number } = {},
): Promise<void> {
  const t = ctx.t;
  // Glorious Empire Aslan: a Tolerance gained from an event may be taken as Diplomat instead (GE p57).
  if (name === "Tolerance" && ctx.settings.setting === "glorious-empire" && t.speciesId === "ge-aslan" && !o.spec) {
    name = await ctx.one("Tolerance is a weakness in the Empire. Take it, or Diplomat instead?", [
      { label: "Tolerance", value: "Tolerance" },
      { label: "Diplomat", value: "Diplomat" },
    ], { hint: 1, always: true });
  }
  if (PSIONIC_TALENTS.includes(name)) {
    await gainTalent(ctx, env, name, o.level);
    return;
  }
  const spec = await pickSpec(ctx, name, o, o.level === undefined ? (t.skills[name] ? 1 : 1) : o.level);
  const r = o.level === undefined ? raiseSkill(t, name, spec, o.limit) : setSkill(t, name, spec, o.level, o.limit);
  reportSkill(ctx, env, name, spec, r);
}

/** Apply a parsed gain (skill, characteristic, share, cash, choice). */
export async function applyGain(ctx: Ctx, env: Env | undefined, g: Gain, label?: string): Promise<void> {
  const t = ctx.t;
  switch (g.k) {
    case "none":
      return;
    case "skill":
      return gainSkill(ctx, env, g.name, {
        ...(g.spec !== undefined ? { spec: g.spec } : {}),
        ...(g.specChoices ? { specChoices: g.specChoices } : {}),
        ...(g.level !== undefined ? { level: g.level } : {}),
      });
    case "stat":
      return changeStat(ctx, g.stat, g.delta, g.atLeast);
    case "shares": {
      const n = g.dice ? (await ctx.roll(g.dice, `${g.kind} shares`)).total : g.n;
      if (g.kind === "ship") t.shipShares += n;
      else t.clanShares += n;
      ctx.log(`${n} ${g.kind === "ship" ? "Ship" : "Clan"} Share${n === 1 ? "" : "s"}.`, "benefit");
      return;
    }
    case "cash":
      t.cash += g.amount;
      ctx.log(`${fmt(g.amount)}.`, "benefit");
      return;
    case "talent": {
      const talent = await ctx.one(
        "Which psionic talent?",
        PSIONIC_TALENTS.map((x) => ({ label: x, value: x, ...(t.skills[x] ? { detail: `now ${t.skills[x]!.level}` } : {}) })),
      );
      return gainTalent(ctx, env, talent, g.level);
    }
    case "anySkill":
      return anySkill(ctx, env, g.level, ["Jack-of-all-Trades"]);
    case "benefit":
      throw new Error(`Benefit ${g.name} outside mustering out`);
    case "choice": {
      // "SOC 10 or SOC +1": the book means whichever is higher, so no question.
      if (g.options.every((o) => o.k === "stat" && o.stat === (g.options[0] as { stat: Stat }).stat)) {
        const s = (g.options[0] as { stat: Stat }).stat;
        const cur = t.stats[s] ?? 0;
        const best = g.options.reduce((a, o) => {
          const v = o.k === "stat" ? (o.atLeast !== undefined ? Math.max(cur, o.atLeast) : cur + (o.delta ?? 0)) : cur;
          return v > a.v ? { v, o } : a;
        }, { v: -Infinity, o: g.options[0]! });
        return applyGain(ctx, env, best.o);
      }
      hasSlaveAlternative = g.options.some((x) => x.tags?.includes("slave"));
      const opts = g.options.filter((x) => tagOk(t, x));
      hasSlaveAlternative = false;
      const usable = opts.length > 0 ? opts : g.options;
      const pick = await ctx.one(
        label ?? env?.context ?? "Choose one",
        usable.map((x) => ({ label: describeGain(x), value: x })),
      );
      return applyGain(ctx, env, pick);
    }
    case "all":
      for (const x of g.items) await applyGain(ctx, env, x);
      return;
  }
}

export async function changeStat(ctx: Ctx, s: Stat, delta?: number, atLeast?: number): Promise<void> {
  const t = ctx.t;
  if (s === "PSI" && t.stats.PSI === undefined) {
    ctx.log(`PSI ${delta !== undefined ? sign(delta) : atLeast}: no effect, PSI untested.`, "info");
    return;
  }
  if (s === "TER" && t.stats.TER === undefined) {
    ctx.log("TER: no effect, this species has no Territory score.", "info");
    return;
  }
  const cur = t.stats[s] ?? 0;
  let next = atLeast !== undefined ? Math.max(cur, atLeast) : cur + (delta ?? 0);
  const max = maxStat(t, s);
  if (next > max) {
    const excess = next - max;
    next = max;
    if (s === "SOC") {
      t.shipShares += excess;
      ctx.log(`SOC above ${max}: ${excess} excess becomes Ship Share${excess === 1 ? "" : "s"} (CRB p47).`, "benefit");
    } else ctx.log(`${s} capped at ${max}.`, "info");
  }
  if (next < 0) next = 0;
  t.stats[s] = next;
  if (next !== cur) ctx.log(`${s} ${sign(next - cur)} (now ${next}).`, "skill");
  else if (atLeast !== undefined) ctx.log(`${s} already ${cur}.`, "info");
}

export function maxStat(t: Traveller, s: Stat): number {
  const sp = findSpecies(t.speciesId);
  return sp.max?.[s] ?? Math.max(15, (t.initialStats[s] ?? 0));
}

/** Any skill of the player's choice, +1 or at a set level. */
export async function anySkill(ctx: Ctx, env: Env | undefined, level?: number, except: string[] = [], limit?: number): Promise<void> {
  const t = ctx.t;
  const names = anySkillNames(ctx.settings.setting === "glorious-empire").filter((n) => !except.includes(n));
  const name = await ctx.one(
    level === undefined ? "Increase any skill by one level" : `Gain any skill at level ${level}`,
    names.map((n) => {
      const lv = skillLevel(t, n);
      return { label: n, value: n, ...(lv !== undefined ? { detail: `now ${lv}` } : {}) };
    }),
  );
  await gainSkill(ctx, env, name, { ...(level !== undefined ? { level } : {}), ...(limit !== undefined ? { limit } : {}) });
}

/** Increase by one level a skill the Traveller already has. */
export async function improveExisting(ctx: Ctx, env: Env | undefined): Promise<void> {
  const t = ctx.t;
  const opts: Option<{ name: string; spec?: string }>[] = [];
  for (const [name, s] of Object.entries(t.skills)) {
    if (PSIONIC_TALENTS.includes(name)) continue;
    const specs = Object.entries(s.specs);
    if (hasSpecialities(name)) {
      for (const [sp, lv] of specs) opts.push({ label: `${name} (${sp}) ${lv}`, value: { name, spec: sp }, ...(lv >= 4 ? { disabled: "at 4" } : {}) });
      opts.push({ label: `${name} (a new speciality) 0`, value: { name } });
    } else opts.push({ label: `${name} ${s.level}`, value: { name }, ...(s.level >= 4 ? { disabled: "at 4" } : {}) });
  }
  if (opts.filter((o) => !o.disabled).length === 0) {
    ctx.log("No skill to improve.", "info");
    return;
  }
  const pick = await ctx.one("Increase which skill you already have?", opts);
  await gainSkill(ctx, env, pick.name, pick.spec ? { spec: pick.spec } : {});
}

// ---------------------------------------------------------------- psionics

/** Test PSI: 2D minus terms served (CRB p228). Returns the score. */
export async function testPsi(ctx: Ctx): Promise<number> {
  const t = ctx.t;
  if (t.psiTested) return t.stats.PSI ?? 0;
  const r = await ctx.roll("2D", "PSI test");
  const psi = Math.max(0, r.total - t.terms);
  t.stats.PSI = psi;
  t.psiTested = true;
  ctx.log(`PSI tested: rolled ${r.total} - ${t.terms} terms = PSI ${psi}.${psi === 0 ? " No psionic potential." : ""}`, "roll");
  return psi;
}

/** Try to learn one talent (CRB p228). Telepathy chosen first is automatic. */
export async function learnTalent(ctx: Ctx, talent: string): Promise<boolean> {
  const t = ctx.t;
  if (t.skills[talent]) return true;
  const firstTelepathy = talent === "Telepathy" && t.talentAttempts === 0;
  const learnDM = PSIONIC_TRAINING.find((p) => p.talent === talent)?.dm ?? 0;
  let ok = firstTelepathy;
  if (!ok) {
    const r = await check(ctx, `PSI ${PSIONICS.learnTarget}+`, `Learn ${talent}`, learnDM - t.talentAttempts);
    ok = r.pass;
  } else ctx.log("Telepathy as the first talent is learned automatically.", "info");
  t.talentAttempts++;
  if (ok) {
    t.skills[talent] = { level: 0, specs: {} };
    ctx.log(`${talent} 0 learned.`, "skill");
  } else ctx.log(`${talent} not learned.`, "info");
  return ok;
}

/** A talent from a skill table: learn it if new (Psion, CRB p229), else +1. */
async function gainTalent(ctx: Ctx, env: Env | undefined, talent: string, level?: number): Promise<void> {
  const t = ctx.t;
  if ((t.stats.PSI ?? 0) <= 0) {
    ctx.log(`${talent}: no effect without PSI.`, "info");
    return;
  }
  if (!t.skills[talent]) {
    const learned = await learnTalent(ctx, talent);
    if (!learned || level === undefined) return;
  }
  const r = level === undefined ? raiseSkill(t, talent, undefined) : setSkill(t, talent, undefined, level);
  reportSkill(ctx, env, talent, undefined, r);
}

/** Every talent attempt in an order the player picks (on entering the Psion career, or institute training). */
export async function talentRolls(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  let remaining = PSIONIC_TRAINING.map((p) => p.talent).filter((x) => !t.skills[x]);
  while (remaining.length > 0) {
    const next = await ctx.one(
      "Attempt which talent next?",
      remaining.map((x) => {
        const p = PSIONIC_TRAINING.find((q) => q.talent === x)!;
        return { label: x, value: x, detail: `learning DM ${sign(p.dm)}` };
      }),
      { hint: 0, always: true },
    );
    await learnTalent(ctx, next);
    remaining = remaining.filter((x) => x !== next);
  }
}

// ---------------------------------------------------------------- injury

async function choosePhysical(ctx: Ctx, prompt: string, among: Stat[]): Promise<Stat> {
  return ctx.one(
    prompt,
    among.map((s) => ({ label: `${s} (${stat(ctx.t, s)})`, value: s })),
  );
}

async function lose(ctx: Ctx, s: Stat, n: number, why: string): Promise<number> {
  const t = ctx.t;
  const cur = t.stats[s] ?? 0;
  const loss = Math.min(cur, n);
  t.stats[s] = cur - loss;
  t.injuryLoss[s] = (t.injuryLoss[s] ?? 0) + loss;
  ctx.log(`${why}: ${s} -${loss} (now ${t.stats[s]}).`, "warn");
  return loss;
}

/** Roll on the Injury table (CRB p49) and offer medical care. */
export async function injury(
  ctx: Ctx,
  env: Env | undefined,
  mode: "roll" | "worst2" | "best2" | "fixed" | "severe" = "roll",
  fixed?: number,
): Promise<void> {
  let result: number;
  if (mode === "severe") {
    mode = await ctx.one("Severely injured", [
      { label: "Take result 2 on the Injury table (one physical characteristic -1D)", value: "fixed" as const },
      { label: "Roll twice on the Injury table and take the lower", value: "worst2" as const },
    ], { hint: 1, always: true });
    fixed = 2;
  }
  if (mode === "fixed") result = fixed ?? 2;
  else if (mode === "worst2" || mode === "best2") {
    const a = (await ctx.roll("1D", "Injury")).total;
    const b = (await ctx.roll("1D", "Injury")).total;
    result = mode === "worst2" ? Math.min(a, b) : Math.max(a, b);
  } else result = (await ctx.roll("1D", "Injury")).total;
  const row = INJURY.find((r) => r.roll === result)!;
  ctx.log(`Injury: ${row.name}.`, "warn");
  const before = { ...ctx.t.injuryLoss };
  let lost = 0;
  switch (result) {
    case 1: {
      const a = await choosePhysical(ctx, "Nearly killed: which characteristic loses 1D?", [...PHYSICAL]);
      lost += await lose(ctx, a, (await ctx.roll("1D", "Injury loss")).total, "Nearly killed");
      for (const s of PHYSICAL.filter((x) => x !== a)) lost += await lose(ctx, s, 2, "Nearly killed");
      break;
    }
    case 2: {
      const a = await choosePhysical(ctx, "Severely injured: which characteristic loses 1D?", [...PHYSICAL]);
      lost += await lose(ctx, a, (await ctx.roll("1D", "Injury loss")).total, "Severely injured");
      break;
    }
    case 3: {
      const a = await choosePhysical(ctx, "Missing eye or limb: STR or DEX -2?", ["STR", "DEX"]);
      lost += await lose(ctx, a, 2, "Missing eye or limb");
      ctx.t.wounds.push("Missing eye or limb");
      break;
    }
    case 4: {
      const a = await choosePhysical(ctx, "Scarred: which characteristic -2?", [...PHYSICAL]);
      lost += await lose(ctx, a, 2, "Scarred");
      ctx.t.wounds.push("Scarred");
      break;
    }
    case 5: {
      const a = await choosePhysical(ctx, "Injured: which characteristic -1?", [...PHYSICAL]);
      lost += await lose(ctx, a, 1, "Injured");
      break;
    }
    default:
      return;
  }
  if (lost > 0) await medicalCare(ctx, env, before);
}

/** Medical care for the points just lost (CRB p49). */
async function medicalCare(ctx: Ctx, env: Env | undefined, before: Partial<Record<Stat, number>>): Promise<void> {
  const t = ctx.t;
  const fresh: Partial<Record<Stat, number>> = {};
  let points = 0;
  for (const s of PHYSICAL) {
    const d = (t.injuryLoss[s] ?? 0) - (before[s] ?? 0);
    if (d > 0) {
      fresh[s] = d;
      points += d;
    }
  }
  let cover = 0;
  if (env?.career && env.rec) {
    const r = await ctx.roll("2D", "Medical bills");
    const total = r.total + env.rec.rank;
    cover = medicalCover(env.career.medical, total);
    ctx.log(`Medical bills: rolled ${r.total} + rank ${env.rec.rank} = ${total}; the ${env.career.name} pays ${cover}%.`, "roll");
  }
  const fullCost = points * RESTORE_COST_PER_POINT;
  const cost = Math.round((fullCost * (100 - cover)) / 100);
  const restore = await ctx.one(
    `Restore the ${points} lost point${points === 1 ? "" : "s"}? Full cost ${fmt(fullCost)}, you pay ${fmt(cost)}.`,
    [
      { label: cost === 0 ? "Restore (free)" : `Restore, adding ${fmt(cost)} to medical debt`, value: true },
      { label: "Live with it", value: false },
    ],
    { hint: cost <= 20000 ? 0 : 1, always: cost > 0 },
  );
  if (restore) {
    for (const [s, d] of Object.entries(fresh) as [Stat, number][]) {
      t.stats[s] = (t.stats[s] ?? 0) + d;
      t.injuryLoss[s] = (t.injuryLoss[s] ?? 0) - d;
      if (t.injuryLoss[s] === 0) delete t.injuryLoss[s];
    }
    t.debt += cost;
    ctx.log(`Medical care restores the lost points${cost > 0 ? `; ${fmt(cost)} owed` : ""}.`, "info");
  }
}

// ---------------------------------------------------------------- tables

export function availableTables(t: Traveller, career: Career, rec: CareerRecord): SkillTableDef[] {
  const asg = career.assignments.find((a) => a.id === rec.assignmentId)!;
  const out: SkillTableDef[] = [];
  for (const tb of career.tables) {
    const r = tb.requires;
    if (r?.minEdu !== undefined && stat(t, "EDU") < r.minEdu) continue;
    if (r?.commissioned && !rec.officer) continue;
    if (r?.gender && t.gender !== r.gender && !(t.gender === "other")) continue;
    if (r?.minRank !== undefined && rec.rank < r.minRank) continue;
    out.push(tb);
    if (tb.kind === "service") out.push({ id: `assignment:${asg.id}`, name: `${asg.name} (assignment)`, kind: "other", rows: asg.skills });
  }
  if (!out.some((x) => x.id.startsWith("assignment:"))) out.push({ id: `assignment:${asg.id}`, name: `${asg.name} (assignment)`, kind: "other", rows: asg.skills });
  return out;
}

/** One roll on a skill table of the player's choice (CRB p18). */
export async function skillRoll(ctx: Ctx, env: Env, why = "Skill roll"): Promise<void> {
  const { career, rec } = env;
  if (!career || !rec) return;
  const tables = availableTables(ctx.t, career, rec);
  const tb = await ctx.one(
    `${why}: roll on which table?`,
    tables.map((x) => ({ label: x.name, value: x, detail: x.rows.join(" · ") })),
    { always: true },
  );
  await rollOnTable(ctx, env, tb.rows, tb.name);
}

export async function rollOnTable(ctx: Ctx, env: Env, rows: string[], name: string): Promise<void> {
  let r = (await ctx.roll("1D", name)).total;
  let entry = rows[r - 1]!;
  // Glorious Empire: Tolerance rolled must be rolled twice to stick (GE p57).
  if (/\bTolerance\b/.test(entry) && ctx.settings.setting === "glorious-empire" && ctx.t.speciesId === "ge-aslan") {
    ctx.log(`${name}: rolled ${r}, Tolerance; the Empire frowns on it, so roll again.`, "roll");
    r = (await ctx.roll("1D", name)).total;
    entry = rows[r - 1]!;
    if (/\bTolerance\b/.test(entry)) ctx.log("Tolerance again: the Traveller has overcome the Empire's prejudice.", "info");
  }
  ctx.log(`${name}: rolled ${r}, ${entry}.`, "roll");
  await applyGain(ctx, env, parseGain(entry), `${name}: ${entry}`);
}

/** Rank bonus on reaching `rank` (CRB p19). */
export async function rankBonus(ctx: Ctx, env: Env, rank: number): Promise<void> {
  const { career, rec } = env;
  if (!career || !rec) return;
  const title = rankTitle(career, rec, rank);
  const rt = rankTable(career, rec);
  const bonus = rt?.ranks[rank]?.bonus;
  if (rank > 0 || title || bonus) ctx.log(`${career.name} rank ${rec.officer ? "O" : ""}${rank}${title ? ` (${title})` : ""}.`, "career");
  if (bonus && bonus !== "--") await applyGain(ctx, env, parseGain(bonus), `Rank bonus: ${bonus}`);
}

export function rankTable(career: Career, rec: CareerRecord) {
  const fits = (r: (typeof career.ranks)[number]) => r.assignments === "all" || r.assignments.includes(rec.assignmentId);
  return career.ranks.find((r) => !!r.officer === rec.officer && fits(r)) ?? career.ranks.find(fits) ?? career.ranks[0];
}

export function rankTitle(career: Career, rec: CareerRecord, rank = rec.rank): string | undefined {
  return rankTable(career, rec)?.ranks[rank]?.title;
}

// ---------------------------------------------------------------- effects

export async function applyEffects(ctx: Ctx, env: Env, effects: Effect[]): Promise<void> {
  for (const e of effects) await applyEffect(ctx, env, e);
}

export async function rollTableRow(ctx: Ctx, env: Env, rows: TableRow[], dice: "1D" | "2D", label: string, kind: "event" | "mishap"): Promise<TableRow> {
  const r = (await ctx.roll(dice, label)).total;
  const row = rows.find((x) => x.roll === r) ?? rows[rows.length - 1]!;
  ctx.log(`${label} (${r}): ${row.text}`, kind);
  const before = env.context;
  env.context = row.text;
  await applyEffects(ctx, env, row.effects);
  env.context = before;
  return row;
}

export async function lifeEvent(ctx: Ctx, env: Env): Promise<void> {
  await rollTableRow(ctx, env, LIFE_EVENTS, "2D", "Life event", "event");
}

/** Roll on the career's Mishap table. Ejects unless the mishap says otherwise (or the career is Prisoner). */
export async function mishap(ctx: Ctx, env: Env, eject = true, career = env.career): Promise<void> {
  if (!career) return;
  const tables = tablesFor(career, env.rec?.careerId === career.id ? env.rec.assignmentId : "");
  const inner: Env = { ...env, stay: false };
  env.term.mishap = true;
  await rollTableRow(ctx, inner, tables.mishaps, "1D", `${career.name} mishap`, "mishap");
  if (eject && !inner.stay && env.career?.id !== "prisoner") {
    env.term.ejected = true;
    if (!env.term.keepBenefit) env.term.benefitLost = true;
  }
}

async function associate(ctx: Ctx, env: Env, kind: AssociateKind, count: Amount | undefined, note?: string): Promise<void> {
  const n = await rollAmount(ctx, count, `Number of ${kind}s`);
  for (let i = 0; i < n; i++) ctx.t.associates.push({ kind, note: note ?? "", origin: env.where });
  const word = { contact: "Contact", ally: "Ally", rival: "Rival", enemy: "Enemy" }[kind];
  ctx.log(`Gain ${n === 1 ? `a${kind === "ally" || kind === "enemy" ? "n" : ""} ${word}` : `${n} ${word === "Ally" ? "Allies" : word === "Enemy" ? "Enemies" : `${word}s`}`}${note ? ` (${note})` : ""}.`, "info");
}

export async function applyEffect(ctx: Ctx, env: Env, e: Effect): Promise<void> {
  const t = ctx.t;
  switch (e.t) {
    case "gain":
      return applyGain(ctx, env, parseGain(e.what), e.what);
    case "anySkill":
      return anySkill(ctx, env, e.level, e.except ?? ["Jack-of-all-Trades"]);
    case "improveExisting":
      return improveExisting(ctx, env);
    case "choose": {
      const pick = await ctx.one(e.prompt ?? env.context ?? "Choose", e.options.map((o) => ({ label: o.label, value: o })), { always: true, ...(e.prompt && env.context ? { detail: env.context } : {}) });
      ctx.log(`Chose: ${pick.label}.`, "info");
      return applyEffects(ctx, env, pick.effects);
    }
    case "optional": {
      const yes = await ctx.yes(e.prompt, env.context && env.context !== e.prompt ? { detail: env.context } : {});
      ctx.log(`${e.prompt} ${yes ? "Yes." : "No."}`, "info");
      return applyEffects(ctx, env, yes ? e.yes : (e.no ?? []));
    }
    case "check": {
      const r = await check(ctx, e.check, "Check", e.dm ?? 0);
      if (r.natural === 2 && e.on2) return applyEffects(ctx, env, e.on2);
      if (r.pass && e.highTarget !== undefined && r.total >= e.highTarget && e.high) return applyEffects(ctx, env, e.high);
      return applyEffects(ctx, env, (r.pass ? e.pass : e.fail) ?? []);
    }
    case "roll": {
      const r = (await ctx.roll(e.dice, "Roll")).total + (e.dm ?? 0);
      const row = e.results.find((x) => r >= x.min && r <= x.max);
      ctx.log(`Rolled ${r}${row?.text ? `: ${row.text}` : "."}`, "roll");
      if (row) await applyEffects(ctx, env, row.effects);
      return;
    }
    case "associate":
      return associate(ctx, env, e.kind, e.count, e.note);
    case "convert": {
      const have = t.associates.map((a, i) => ({ a, i })).filter(({ a }) => e.from.includes(a.kind));
      if (have.length === 0) return applyEffects(ctx, env, e.otherwise ?? []);
      const who = await ctx.one(
        `Which ${e.from.join(" or ")} turns?`,
        have.map(({ a, i }) => ({ label: `${a.kind}${a.note ? `: ${a.note}` : ""} (${a.origin})`, value: i })),
      );
      const to = await ctx.one("They become", e.to.map((k) => ({ label: k, value: k })));
      const a = t.associates[who]!;
      ctx.log(`Your ${a.kind}${a.note ? ` (${a.note})` : ""} becomes a${to === "enemy" ? "n" : ""} ${to}.`, "info");
      a.kind = to;
      return;
    }
    case "benefitDM":
      if (env.rec) {
        if (e.all) env.rec.benefitDMAll += e.dm;
        else env.rec.benefitDMs.push(e.dm);
      } else t.looseBenefitDMs.push(e.dm);
      ctx.log(`DM${sign(e.dm)} to ${e.all ? "every" : "one"} Benefit roll.`, "info");
      return;
    case "benefitRolls":
      if (e.n === "term") {
        env.term.benefitLost = true;
        ctx.log("This term's Benefit roll is lost.", "warn");
      } else if (e.n === "career") {
        env.term.benefitLost = true;
        if (env.rec) {
          env.rec.benefitRolls = 0;
          env.rec.noBenefits = true;
        }
        ctx.log("Every Benefit roll from this career is lost.", "warn");
      } else if (env.rec) {
        env.rec.benefitRolls = Math.max(0, env.rec.benefitRolls + e.n);
        if (e.n < 0 && env.rec.benefitRolls === 0 && !env.term.benefitLost) env.term.benefitLost = true;
        ctx.log(`${e.n > 0 ? `Gain ${e.n}` : `Lose ${-e.n}`} Benefit roll${Math.abs(e.n) === 1 ? "" : "s"}.`, e.n > 0 ? "info" : "warn");
      } else {
        t.looseBenefitRolls += e.n;
        ctx.log(`${e.n > 0 ? `Gain ${e.n}` : `Lose ${-e.n}`} Benefit roll${Math.abs(e.n) === 1 ? "" : "s"} (from your next career).`, "info");
      }
      return;
    case "keepBenefit":
      env.term.keepBenefit = true;
      env.term.benefitLost = false;
      ctx.log("You keep this term's Benefit roll.", "info");
      return;
    case "advanceDM":
      t.pending.advanceDM += e.dm;
      ctx.log(`DM${sign(e.dm)} to your next advancement roll.`, "info");
      return;
    case "qualifyDM":
      if (e.career) t.pending.qualifyCareerDM[e.career] = (t.pending.qualifyCareerDM[e.career] ?? 0) + e.dm;
      else t.pending.qualifyDM += e.dm;
      ctx.log(`DM${sign(e.dm)} to your next qualification roll${e.career && hasCareer(e.career) ? ` for ${findCareer(e.career).name}` : ""}.`, "info");
      return;
    case "survivalDM":
      if (e.scope === "career" && env.rec) env.rec.survivalDM += e.dm;
      else t.pending.survivalDM += e.dm;
      ctx.log(`DM${sign(e.dm)} to ${e.scope === "career" ? "survival rolls in this career" : "your next survival roll"}.`, "info");
      return;
    case "promote":
      env.term.promote = true;
      ctx.log("Automatic promotion.", "info");
      return;
    case "promoteOrCommission":
      env.term.promoteOrCommission = true;
      ctx.log("Automatic promotion or commission.", "info");
      return;
    case "rank":
      if (env.rec) {
        env.rec.rank = Math.max(0, env.rec.rank + e.delta);
        ctx.log(`Rank ${sign(e.delta)} (now ${env.rec.rank}).`, e.delta < 0 ? "warn" : "info");
      }
      return;
    case "mishap":
      return mishap(ctx, env, e.eject !== false);
    case "injury":
      return injury(ctx, env, e.mode ?? "roll", e.result);
    case "lifeEvent":
      return lifeEvent(ctx, env);
    case "otherTable": {
      const ids = e.careers.filter(hasCareer);
      const id = await ctx.one(`Roll on which career's ${e.table === "events" ? "Events" : "Mishap"} table?`, ids.map((x) => ({ label: findCareer(x).name, value: x })));
      const other = findCareer(id);
      if (e.table === "events") {
        await rollTableRow(ctx, { ...env, where: `${env.where}, ${other.name} event` }, other.events, "2D", `${other.name} event`, "event");
        if (e.thenSkillRoll) {
          const asg = await ctx.one(`Roll on which ${other.name} assignment table?`, other.assignments.map((a) => ({ label: a.name, value: a, detail: a.skills.join(" · ") })), { always: true });
          await rollOnTable(ctx, env, asg.skills, `${other.name} ${asg.name}`);
        }
      } else await mishap(ctx, env, true, other);
      return;
    }
    case "leave":
      env.term.leave = true;
      ctx.log("You leave this career at the end of the term.", "info");
      return;
    case "stay":
      env.stay = true;
      return;
    case "mustContinue":
      env.term.mustContinue = true;
      ctx.log("You must continue in this career next term.", "info");
      return;
    case "nextTerm": {
      const career = e.career === "draft" || e.career === "drifter" ? e.career : e.career;
      t.forcedNext = { career, ...(e.assignment ? { assignment: e.assignment } : {}) };
      ctx.log(`Next term: ${career === "draft" ? "the draft" : hasCareer(career) ? findCareer(career).name : career}.`, "warn");
      return;
    }
    case "draftOrDrifter": {
      if (e.canAvoid) {
        const r = await check(ctx, e.canAvoid, "Avoid the draft");
        if (r.pass) return;
      }
      const pick = await ctx.one("Flee or be drafted?", [
        { label: "Flee: Drifter next term", value: "drifter" },
        { label: "Be drafted", value: "draft" },
      ], { always: true });
      t.forcedNext = { career: pick };
      return;
    }
    case "psionicTest":
      return psionicTestEvent(ctx);
    case "cash": {
      const mult = e.dice ? await rollAmount(ctx, e.dice, "Credits") : 1;
      const amount = e.amount * mult;
      if (amount >= 0) t.cash += amount;
      else t.debt += -amount;
      ctx.log(amount >= 0 ? `Gain ${fmt(amount)}.` : `Owe ${fmt(-amount)}.`, amount >= 0 ? "benefit" : "warn");
      return;
    }
    case "parole": {
      if (!env.rec) return;
      const cur = env.rec.parole ?? 0;
      let next: number;
      if (e.delta === "reroll") next = (await ctx.roll("1D", "Parole threshold")).total + PAROLE.base;
      else if (e.delta === "-1D") next = cur - (await ctx.roll("1D", "Parole reduction")).total;
      else next = cur + e.delta;
      env.rec.parole = Math.max(0, Math.min(PAROLE.max, next));
      ctx.log(`Parole threshold now ${env.rec.parole}.`, "info");
      return;
    }
    case "noGraduate":
      env.term.noGraduate = true;
      ctx.log("You will not graduate this term.", "warn");
      return;
    case "note":
      ctx.log(e.text, "info");
      return;
    case "special":
      return special(ctx, env, e.key, e.args ?? {});
  }
}

async function psionicTestEvent(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  if (!ctx.settings.psionics) {
    ctx.log("Psionics are not in use in this campaign; nothing comes of it.", "info");
    return;
  }
  t.psionAllowed = true;
  if (t.psiTested) {
    ctx.log(`Already tested: PSI ${t.stats.PSI}. The Psion career is open.`, "info");
    return;
  }
  const now = await ctx.yes("Test your PSI now? (2D minus terms served; it falls with age)", { hint: true });
  if (now) await testPsi(ctx);
  ctx.log("You may enter the Psion career in a later term.", "info");
}

// ---------------------------------------------------------------- specials

/** Rules only one table has, by name. CharSpec 6.9. */
export const SPECIALS: Record<string, (ctx: Ctx, env: Env, args: Record<string, unknown>) => Promise<void>> = {
  async injureAssociate(ctx) {
    const kin = ctx.t.associates.filter((a) => a.kind === "contact" || a.kind === "ally");
    const who = kin.length > 0 ? await ctx.one("Who is hurt?", [...kin.map((a) => ({ label: `${a.kind}: ${a.note || a.origin}`, value: `your ${a.kind}${a.note ? ` (${a.note})` : ""}` })), { label: "A family member", value: "a family member" }]) : "a family member";
    const a = (await ctx.roll("1D", "Their injury")).total;
    const b = (await ctx.roll("1D", "Their injury")).total;
    const row = INJURY.find((r) => r.roll === Math.min(a, b))!;
    ctx.log(`${who[0]!.toUpperCase()}${who.slice(1)} is hurt: ${row.name.toLowerCase()}.`, "warn");
  },
  async possession(ctx, _env, args) {
    const item = String(args.item ?? "Something strange");
    ctx.t.possessions.push({ name: item, source: "Life event" });
    ctx.log(`You have: ${item}.`, "benefit");
  },
  async distinctSpecialities(ctx, env, args) {
    const skill = String(args.skill ?? "Science");
    const n = Number(args.count ?? 2);
    const specs = findSkill(skill)?.specialities ?? [];
    const picks = await ctx.many(`Raise ${n} different specialities of ${skill}`, specs.map((s) => ({ label: `${skill} (${s})`, value: s })), n);
    for (const spec of picks) await gainSkill(ctx, env, skill, { spec });
  },
  async injuryBest2(ctx, env) {
    await injury(ctx, env, "best2");
  },
  async unusualEvent(ctx, env) {
    const row = LIFE_EVENTS.find((r) => r.roll === 12)!;
    await applyEffects(ctx, env, row.effects);
  },
  async associateIfNone(ctx, env, args) {
    const kind = (args.kind as AssociateKind) ?? "enemy";
    if (!ctx.t.associates.some((a) => a.kind === kind)) await associate(ctx, env, kind, 1, undefined);
  },
  async byAssignment(ctx, env, args) {
    const cases = (args.cases ?? {}) as Record<string, Effect[]>;
    await applyEffects(ctx, env, cases[env.rec?.assignmentId ?? ""] ?? []);
  },
  async skillRoll(ctx, env, args) {
    const n = Number(args.count ?? 1);
    for (let i = 0; i < n; i++) await skillRoll(ctx, env, "Extra skill roll");
  },
  gambleBenefitRolls: wager,
  wagerBenefitRolls: wager,
  async hireLawyer(ctx, env) {
    if (!env.rec) return;
    const lv = await ctx.one("Hire a lawyer? Cost is Cr1000 x Advocate level squared.", [
      { label: "No lawyer", value: 0 },
      ...[1, 2, 3, 4].map((n) => ({ label: `Advocate ${n} (${fmt(1000 * n * n)})`, value: n })),
    ], { hint: 2, always: true });
    if (lv === 0) return;
    ctx.t.debt += 1000 * lv * lv;
    ctx.log(`Hired a lawyer with Advocate ${lv} for ${fmt(1000 * lv * lv)}.`, "info");
    const r = (await ctx.roll("2D", "Lawyer")).total + lv;
    if (r >= 8) {
      const d = (await ctx.roll("1D", "Parole reduction")).total;
      env.rec.parole = Math.max(0, (env.rec.parole ?? 0) - d);
      ctx.log(`The lawyer succeeds (${r}): parole threshold -${d}, now ${env.rec.parole}.`, "info");
    } else ctx.log(`The lawyer fails (${r}).`, "info");
  },
  async tutorChallenge(ctx, env) {
    const learned = [...new Set(env.term.skillsGained)];
    const pool = learned.length > 0 ? learned : (ctx.t.education?.skills ?? []).map((s) => s.replace(/ \(.*\)$/, ""));
    if (pool.length === 0) {
      ctx.log("No skill from this term to stake on the challenge.", "info");
      return;
    }
    const skill = await ctx.one("Prove the tutor wrong with which skill learned this term?", pool.map((s) => ({ label: s, value: s })));
    const r = await check(ctx, `${skill} 9+`, "Tutor's challenge");
    if (r.pass) {
      await gainSkill(ctx, env, skill);
      await associate(ctx, env, "rival", 1, "Your old tutor");
    }
  },
  async warDraft(ctx, env) {
    const avoid = await check(ctx, "SOC 9+", "Pull strings to avoid the draft");
    if (avoid.pass) {
      ctx.log("Strings are pulled; you finish your studies.", "info");
      return;
    }
    env.term.noGraduate = true;
    const pick = await ctx.one("War: flee or be drafted?", [
      { label: "Flee: Drifter next term", value: "drifter" },
      { label: "Be drafted (1D: 1-3 Army, 4-5 Marines, 6 Navy)", value: "draft" },
    ], { always: true });
    if (pick === "drifter") ctx.t.forcedNext = { career: "drifter" };
    else {
      const r = (await ctx.roll("1D", "War draft")).total;
      const career = warDraftCareer(r);
      ctx.t.forcedNext = { career };
      ctx.log(`Drafted into the ${findCareer(career).name}.`, "warn");
    }
  },
  // Glorious Empire.
  async onlyLandlessOrOutlaw(ctx) {
    ctx.t.restrictTo = ["ge-landless-one"];
    ctx.log("Only the Landless One (or Outlaw) career is open to you now.", "warn");
  },
  async termsAsQualifyDM(ctx, env, args) {
    const career = String(args.career ?? "");
    if (args.species === "aslan" && !ctx.t.speciesId.includes("aslan")) return;
    const n = env.rec?.terms ?? 0;
    ctx.t.pending.qualifyCareerDM[career] = (ctx.t.pending.qualifyCareerDM[career] ?? 0) + n;
    ctx.log(`DM+${n} to qualify for ${hasCareer(career) ? findCareer(career).name : career} next term.`, "info");
  },
  async combatImplant(ctx) {
    ctx.t.possessions.push({ name: "Combat implant", detail: "Choose a suitable augmentation", source: "Mishap" });
    ctx.log("You receive a combat implant.", "benefit");
  },
  async setStat(ctx, _env, args) {
    const s = String(args.stat ?? "SOC") as Stat;
    const v = Number(args.value ?? 0);
    ctx.t.stats[s] = v;
    ctx.log(`${s} becomes ${v}.`, "warn");
  },
  async loseAssociate(ctx, _env, args) {
    const kinds = (args.kinds as AssociateKind[] | undefined) ?? ["contact", "ally"];
    const have = ctx.t.associates.map((a, i) => ({ a, i })).filter(({ a }) => kinds.includes(a.kind));
    if (have.length === 0) {
      await applyEffects(ctx, _env, (args.otherwise as Effect[] | undefined) ?? []);
      return;
    }
    const i = await ctx.one("Who do you lose?", have.map(({ a, i }) => ({ label: `${a.kind}: ${a.note || a.origin}`, value: i })));
    const [a] = ctx.t.associates.splice(i, 1);
    ctx.log(`You lose your ${a!.kind}${a!.note ? ` (${a!.note})` : ""}.`, "warn");
  },
  async leaveEmpire(ctx, env, args) {
    const to = args.to === "hierate" ? "hierate" : "core";
    ctx.t.leftEmpire = to;
    ctx.t.restrictTo = undefined;
    env.term.leave = true;
    ctx.log(to === "hierate" ? "You leave the Glorious Empire for the Hierate." : "You leave the Glorious Empire; Core careers are open to you.", "info");
  },
  async mercenaryEvent(ctx, env) {
    if (env.rec) env.rec.mercenary = true;
    ctx.log("A Mercenary Event: DM+1 to every Benefit roll from this career.", "info");
  },
  async redemption(ctx) {
    ctx.t.restrictTo = undefined;
    const before = ctx.t.initialStats.SOC;
    if (before !== undefined && (ctx.t.stats.SOC ?? 0) < before) ctx.t.stats.SOC = before;
    ctx.log("Redemption: your standing returns and other careers open to you again.", "info");
  },
  async cashBenefitRoll(ctx, env, args) {
    if (!env.rec) return;
    const n = Number(args.n ?? 1);
    env.rec.benefitRolls += n;
    env.rec.cashOnlyRolls = (env.rec.cashOnlyRolls ?? 0) + n;
    ctx.log(`Gain ${n} extra Benefit roll${n === 1 ? "" : "s"} on the Cash column.`, "info");
  },
  async changeAssignment(ctx) {
    ctx.t.changeAssignment = true;
    ctx.log("You must take a different assignment next term.", "info");
  },
  async death(ctx, env) {
    ctx.t.dead = true;
    env.term.ejected = true;
    ctx.log("The Traveller dies.", "warn");
  },
  async returnToCareer(ctx, _env, args) {
    ctx.t.returnTo = String(args.career ?? "");
    ctx.log("After that, you return to this career.", "info");
  },
};

async function wager(ctx: Ctx, env: Env, args: Record<string, unknown>): Promise<void> {
  if (!env.rec) return;
  const have = env.rec.benefitRolls;
  if (have <= 0) {
    ctx.log("No Benefit rolls to stake.", "info");
    return;
  }
  const n = await ctx.number(`Stake how many of your ${have} Benefit rolls from this career?`, 0, have, { hint: Math.min(1, have) });
  if (n === 0) return;
  const checks = (args.checks as string[] | undefined) ?? [String(args.check ?? "Gambler 8+")];
  const c = checks.length > 1 ? await ctx.one("Which skill do you use?", checks.map((x) => ({ label: x, value: x }))) : checks[0]!;
  const r = await check(ctx, c, "Wager");
  if (r.pass) {
    const won = Math.ceil(n / 2);
    env.rec.benefitRolls += won;
    ctx.log(`The gamble pays: +${won} Benefit roll${won === 1 ? "" : "s"}.`, "benefit");
  } else {
    env.rec.benefitRolls -= n;
    ctx.log(`The gamble fails: ${n} Benefit roll${n === 1 ? "" : "s"} lost.`, "warn");
  }
  if (args.checks) {
    const skill = r.option.kind === "skill" ? r.option.name : undefined;
    if (skill) await gainSkill(ctx, env, skill);
  }
}

async function special(ctx: Ctx, env: Env, key: string, args: Record<string, unknown>): Promise<void> {
  const fn = SPECIALS[key];
  if (!fn) {
    ctx.log(`(Unhandled rule "${key}"; apply it by hand.)`, "warn");
    return;
  }
  await fn(ctx, env, args);
}

export { SKILLS };
