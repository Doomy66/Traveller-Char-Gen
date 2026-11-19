import { CAREERS, findCareer, hasCareer, tablesFor } from "../rules/careers/index";
import { GE_RULES } from "../rules/careers/ge-rules";
import { BACKGROUND_SKILLS, findSkill, hasSpecialities, PSIONIC_TALENTS } from "../rules/skills";
import { findSpecies } from "../rules/species";
import {
  ACADEMIES,
  ACADEMY,
  AGEING_CRISIS_COST,
  AGEING_FROM_TERM,
  ageingEffect,
  ANAGATHICS,
  characteristicDM,
  CONNECTIONS,
  DRAFT,
  PAROLE,
  PRE_CAREER_EVENTS,
  PSIONICS,
  SKILL_PACKAGES,
  UNIVERSITY,
} from "../rules/tables";
import type { Assignment, Career, Stat } from "../rules/types";
import { CORE_STATS, MENTAL, PHYSICAL } from "../rules/types";
import { musterOut } from "./benefits";
import { currentCareer, setSkill, skillLevel, stat, type CareerRecord, type Traveller } from "./character";
import type { Ctx, Option } from "./context";
import {
  anySkill,
  applyEffects,
  applyGain,
  check,
  checkModifier,
  gainSkill,
  mishap,
  newTermState,
  rankBonus,
  rollTableRow,
  skillRoll,
  talentRolls,
  testPsi,
  type Env,
} from "./effects";
import { parseCheck, parseGain } from "./grammar";

/**
 * Traveller creation from start to finish, CRB pp8-57. One async function
 * that stops at every decision; see context.ts. CharSpec 8.
 */

const fmt = (n: number) => `Cr${n.toLocaleString("en-GB")}`;
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export async function createTraveller(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  if (t.history.length === 0) ctx.log(`${t.name || "A new Traveller"} begins, aged 18.`, "info");
  await rollCharacteristics(ctx);
  await backgroundSkills(ctx);
  await terms(ctx);
  if (!t.dead) await finish(ctx);
  t.finished = true;
  ctx.onChange();
}

// ---------------------------------------------------------------- characteristics

async function rollCharacteristics(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  const sp = findSpecies(t.speciesId);
  const stats = [...CORE_STATS, ...(sp.extraStats ?? [])];
  const values: Partial<Record<Stat, number>> = {};
  if (ctx.settings.statMethod === "manual") {
    for (const s of stats) values[s] = await ctx.number(`Enter ${s} (as rolled, before species modifiers)`, 2, 12, { hint: 7 });
  } else {
    const rolls: number[] = [];
    for (let i = 0; i < 6; i++) rolls.push((await ctx.roll("2D", "Characteristic")).total);
    ctx.log(`Characteristics rolled: ${rolls.join(", ")}.`, "roll");
    if (ctx.settings.statMethod === "order") {
      CORE_STATS.forEach((s, i) => (values[s] = rolls[i]));
    } else {
      // Assign each roll in turn; the hint puts the highest where the species and a generalist want it.
      const pool = [...rolls];
      for (const s of CORE_STATS) {
        const order = pool.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
        const placed = CORE_STATS.filter((x) => values[x] !== undefined).map((x) => `${x} ${values[x]}`).join(", ");
        const pickIdx = await ctx.one(
          `Assign a roll to ${s}`,
          pool.map((v, i) => ({ label: String(v), value: i })),
          { hint: order[0]!.i, always: pool.length > 1 && new Set(pool).size > 1, detail: placed ? `So far: ${placed}.` : `Rolls: ${rolls.join(", ")}.` },
        );
        values[s] = pool[pickIdx]!;
        pool.splice(pickIdx, 1);
      }
    }
    for (const s of sp.extraStats ?? []) values[s] = (await ctx.roll("2D", s)).total;
  }
  for (const s of stats) {
    const mod = sp.modifiers[s] ?? 0;
    values[s] = Math.max(1, values[s]! + mod);
  }
  if (t.speciesId === "ge-human-slave") {
    values.SOC = GE_RULES.slaveSoc;
    t.slave = true;
  }
  t.stats = { ...values };
  t.initialStats = { ...values };
  const mods = Object.entries(sp.modifiers).map(([k, v]) => `${k}${sign(v!)}`).join(", ");
  ctx.log(`UPP ${stats.map((s) => `${s} ${values[s]}`).join(", ")}${mods ? ` (${sp.name}: ${mods})` : ""}.`, "info");
  for (const tr of sp.traits) t.traits.push(`${tr.name}: ${tr.text}`);
  if (t.speciesId === "ge-aslan") {
    t.rite = (await ctx.roll("2D", "Rite of passage")).total;
    ctx.log(`Rite of passage: ${t.rite} (DM${sign(characteristicDM(t.rite))} on Rite checks).`, "roll");
  }
  ctx.onChange();
}

async function backgroundSkills(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  const n = Math.max(0, characteristicDM(stat(t, "EDU")) + 3);
  if (n === 0) return;
  const picks = await ctx.many(
    `Choose ${n} background skill${n === 1 ? "" : "s"} at level 0`,
    BACKGROUND_SKILLS.map((s) => ({ label: `${s} 0`, value: s })),
    n,
    { detail: "Skills picked up growing up (CRB p9). They hint at your homeworld." },
  );
  for (const s of picks) setSkill(t, s, undefined, 0);
  ctx.log(`Background skills: ${picks.map((s) => `${s} 0`).join(", ")}.`, "skill");
  ctx.onChange();
}

// ---------------------------------------------------------------- term loop

interface TermPlan {
  kind: "career" | "university" | "academy" | "finish";
  career?: string;
  assignment?: string;
  /** How the Traveller got into the career this term. */
  via?: "continue" | "qualified" | "draft" | "drifter" | "forced" | "automatic";
}

async function terms(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  let lastLeft: string | undefined;
  for (let guard = 0; guard < 40; guard++) {
    if (t.dead) return;
    let plan: TermPlan;
    const cur = currentCareer(t);
    if (t.forcedNext) {
      const f = t.forcedNext;
      t.forcedNext = undefined;
      if (cur && !(cur.careerId === f.career)) {
        cur.endReason = "forced out";
        await musterOut(ctx, cur);
        lastLeft = cur.careerId;
      }
      plan = await forcedPlan(ctx, f.career, f.assignment, cur);
    } else if (cur) {
      plan = { kind: "career", career: cur.careerId, assignment: cur.assignmentId, via: "continue" };
    } else {
      plan = await chooseNext(ctx, lastLeft);
    }
    if (plan.kind === "finish") return;
    if (plan.kind === "university" || plan.kind === "academy") {
      await educationTerm(ctx, plan);
      continue;
    }
    const left = await careerTerm(ctx, plan);
    if (left) lastLeft = left;
    if (t.finished) return;
  }
}

/** Turn a forced next term into a plan. */
async function forcedPlan(ctx: Ctx, career: string, assignment: string | undefined, cur: CareerRecord | undefined): Promise<TermPlan> {
  if (career === "draft") return draft(ctx);
  if (career === "drifter") return { kind: "career", career: "drifter", via: "forced" };
  if (cur && cur.careerId === career) {
    return { kind: "career", career, ...(assignment ? { assignment } : { assignment: cur.assignmentId }), via: "continue" };
  }
  if (!hasCareer(career)) {
    ctx.log(`(Next term should be ${career}, which is not available here; choose freely.)`, "warn");
    return chooseNext(ctx, undefined);
  }
  return { kind: "career", career, ...(assignment ? { assignment } : {}), via: "forced" };
}

/** The draft, CRB p19. */
async function draft(ctx: Ctx): Promise<TermPlan> {
  const t = ctx.t;
  t.drafted = true;
  const r = (await ctx.roll("1D", "Draft")).total;
  const d = DRAFT.find((x) => x.roll === r)!;
  ctx.log(`Drafted: rolled ${r}, ${findCareer(d.career).name}.`, "career");
  return { kind: "career", career: d.career, ...(d.assignment ? { assignment: d.assignment } : {}), via: "draft" };
}

function availableCareers(ctx: Ctx): Career[] {
  const t = ctx.t;
  const ge = ctx.settings.setting === "glorious-empire";
  return CAREERS.filter((c) => {
    if (t.restrictTo) return t.restrictTo.includes(c.id);
    if (c.id === "prisoner") return false;
    if (c.qualification.restricted === "psion") return ctx.settings.psionics && t.psionAllowed;
    if (!ge) return c.setting === "core";
    // Glorious Empire: Aslan take the Empire's careers; human slaves the Slave career until freed.
    if (t.speciesId === "ge-human-slave") {
      if (t.slave) return c.id === "ge-slave";
      return c.setting === "core";
    }
    if (t.leftEmpire) return c.setting === "core" || c.id === "ge-landless-one";
    if (c.id === "ge-slave") return false;
    return c.setting === "glorious-empire";
  });
}

function assignmentsFor(ctx: Ctx, career: Career): Assignment[] {
  const t = ctx.t;
  return career.assignments.filter((a) => {
    if (a.gender && t.gender !== "other" && a.gender !== t.gender) return false;
    if (a.species && !a.species.some((s) => t.speciesId.includes(s))) return false;
    return true;
  });
}

/** Qualification DM for a career (CRB p18, p16). */
function qualifyDM(ctx: Ctx, career: Career, assignment?: string): number {
  const t = ctx.t;
  let d = 0;
  const previous = new Set(t.careers.filter((r) => r.careerId !== career.id).map((r) => r.careerId)).size;
  if (career.qualification.perPreviousCareer) d += career.qualification.perPreviousCareer * previous;
  if (career.qualification.age && t.age >= career.qualification.age.age) d += career.qualification.age.dm;
  d += t.pending.qualifyDM;
  d += t.pending.qualifyCareerDM[career.id] ?? 0;
  const ed = t.education;
  if (ed?.kind === "university" && ed.graduated) {
    const b = UNIVERSITY.careerBonus.find((x) => x.career === career.id);
    if (b && (!b.assignment || !assignment || b.assignment === assignment)) d += ed.honours ? 2 : 1;
  }
  return d;
}

/** Whether a check could ever pass: a 12 on 2D plus the best DM reaches the target (no natural success). */
function canEverPass(ctx: Ctx, text: string, dm: number): boolean {
  return parseCheck(text).some((op) => 12 + checkModifier(ctx.t, op) + dm >= op.target);
}

/** Why the Traveller cannot qualify for a career whatever they roll, or undefined if they can. */
export function cannotQualify(ctx: Ctx, career: Career): string | undefined {
  const t = ctx.t;
  const q = career.qualification;
  const asgs = assignmentsFor(ctx, career);
  if (asgs.length === 0) return "No assignment is open to you";
  if (q.automaticIf && stat(t, q.automaticIf.stat) >= q.automaticIf.min) return undefined;
  const open = asgs.filter((a) => (a.qualification ?? q.check) === null);
  if (open.length > 0) return undefined;
  if (t.ageingCrisis) return "Every qualification fails after your ageing crisis";
  const possible = asgs.some((a) => canEverPass(ctx, (a.qualification ?? q.check)!, qualifyDM(ctx, career, a.id)));
  return possible ? undefined : `Even a 12 cannot make ${q.check}${qualifyDM(ctx, career) ? ` DM${sign(qualifyDM(ctx, career))}` : ""}`;
}

function qualifyText(ctx: Ctx, career: Career): string {
  const q = career.qualification;
  if (q.check === null) return "automatic";
  if (q.automaticIf && stat(ctx.t, q.automaticIf.stat) >= q.automaticIf.min) return "automatic";
  const d = qualifyDM(ctx, career);
  return `${q.check}${d ? ` DM${sign(d)}` : ""} (${chanceOf(ctx, q.check, d)}%)`;
}

/** The chance, in whole per cent, that 2D plus the best DM makes a check. */
function chanceOf(ctx: Ctx, text: string, dm: number): number {
  let best = 0;
  for (const op of parseCheck(text)) {
    const need = op.target - checkModifier(ctx.t, op) - dm;
    let ways = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) ways++;
    best = Math.max(best, ways);
  }
  return Math.round((best / 36) * 100);
}

/** Pick what to do with the next term. */
async function chooseNext(ctx: Ctx, lastLeft: string | undefined, mustCareer = false): Promise<TermPlan> {
  const t = ctx.t;
  const termNo = t.terms + 1;
  const opts: Option<TermPlan>[] = [];
  const core = ctx.settings.setting === "core" || t.leftEmpire !== undefined || (t.speciesId === "ge-human-slave" && !t.slave);
  const restricted = t.restrictTo !== undefined;
  if (!mustCareer) {
    opts.push({ label: t.careers.length === 0 && t.terms === 0 ? "Start adventuring now, aged 18" : "Finish: start adventuring", value: { kind: "finish" } });
  }
  if (!mustCareer && core && !restricted && termNo <= 3 && !t.education && ctx.settings.setting === "core") {
    opts.push({
      label: "University",
      value: { kind: "university" },
      detail: `Entry ${UNIVERSITY.entry}${termDM(ctx, UNIVERSITY.termDM, termNo) + (stat(t, "SOC") >= 9 ? 1 : 0) ? ` DM${sign(termDM(ctx, UNIVERSITY.termDM, termNo) + (stat(t, "SOC") >= 9 ? 1 : 0))}` : ""}`,
    });
    for (const a of ACADEMIES) {
      const d = termDM(ctx, ACADEMY.termDM, termNo);
      opts.push({ label: a.name, value: { kind: "academy", career: a.career }, detail: `Entry ${a.entry}${d ? ` DM${d}` : ""}` });
    }
  }
  for (const c of availableCareers(ctx)) {
    if (c.id === lastLeft && c.id !== "drifter" && !restricted) {
      opts.push({ label: c.name, value: { kind: "career", career: c.id }, disabled: "Left it last term" });
      continue;
    }
    const auto = t.education?.kind === "academy" && t.education.career === c.id && !t.education.autoEntryUsed && (t.education.graduated || t.education.autoEntryOnFail);
    const cannot = auto ? undefined : cannotQualify(ctx, c);
    opts.push({
      label: c.name,
      value: { kind: "career", career: c.id, via: auto ? "automatic" : "qualified" },
      detail: `${c.description} Qualify: ${auto ? "automatic (academy)" : t.ageingCrisis && c.qualification.check ? "fails (ageing crisis)" : qualifyText(ctx, c)}.`,
      ...(cannot ? { disabled: cannot } : {}),
    });
  }
  if (core && !restricted && !t.drafted && ctx.settings.setting === "core") {
    opts.push({ label: "Submit to the draft", value: { kind: "career", career: "draft" }, detail: "1D: Navy, Army, Marines, Merchant Marine, Scouts or Agent (law enforcement). Once in a lifetime." });
  }
  // Never leave nothing to choose: if every option is out of reach, offer them all and let the dice say no.
  if (!opts.some((o) => !o.disabled)) for (const o of opts) if (o.disabled && o.disabled !== "Left it last term") delete o.disabled;
  // A suggestion for automatic answers: a career the Traveller is suited to, varied by name and term.
  const suited = opts.map((o, i) => ({ o, i })).filter(({ o }) => !o.disabled && o.value.kind === "career" && o.value.career !== "draft" && hintCareer(ctx, o.value.career!));
  const hint = suited.length > 0 ? suited[hashOf(`${t.name}/${t.terms}/${t.careers.length}`) % suited.length]!.i : -1;
  const plan = await ctx.one(mustCareer ? "Entry failed: you must try a career this term" : `Term ${termNo}: what next?`, opts, {
    always: true,
    hint: (t.terms >= hintTerms(ctx) || t.ageingCrisis) && !mustCareer ? 0 : Math.max(hint, opts.findIndex((o) => !o.disabled && o.value.kind === "career")),
  });
  if (plan.kind === "career" && plan.career === "draft") return draft(ctx);
  if (plan.kind === "career" && plan.via !== "automatic") return qualifyFor(ctx, plan.career!);
  if (plan.kind === "career" && plan.via === "automatic" && t.education) t.education.autoEntryUsed = true;
  return plan;
}

function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** NPC hints: a random generator stops after 2 to 6 terms, decided by the name. */
function hintTerms(ctx: Ctx): number {
  return 2 + (hashOf(ctx.t.name) % 5);
}
function hintCareer(ctx: Ctx, id: string): boolean {
  const c = findCareer(id);
  if (!c.qualification.check) return false;
  const opt = parseCheck(c.qualification.check)[0]!;
  return opt.kind === "stat" ? stat(ctx.t, opt.stat) >= 7 : true;
}

function termDM(_ctx: Ctx, table: number[], termNo: number): number {
  return table[termNo - 1] ?? 0;
}

/** Choose an assignment and roll to qualify. On failure: the draft or the Drifter (CRB p18). */
async function qualifyFor(ctx: Ctx, careerId: string, retryDM = 0): Promise<TermPlan> {
  const t = ctx.t;
  const career = findCareer(careerId);
  const asg = await chooseAssignment(ctx, career);
  const q = career.qualification;
  const checkText = asg.qualification ?? q.check;
  let ok = false;
  if (checkText === null) ok = true;
  else if (q.automaticIf && stat(t, q.automaticIf.stat) >= q.automaticIf.min) {
    ok = true;
    ctx.log(`${career.name}: automatic qualification (${q.automaticIf.stat} ${stat(t, q.automaticIf.stat)}).`, "career");
  } else if (t.ageingCrisis) {
    ctx.log(`${career.name}: qualification fails automatically after an ageing crisis (CRB p49).`, "warn");
  } else {
    const d = qualifyDM(ctx, career, asg.id) + retryDM;
    const r = await check(ctx, checkText, `Qualify for ${career.name}`, d);
    ok = r.pass;
  }
  t.pending.qualifyDM = 0;
  delete t.pending.qualifyCareerDM[career.id];
  if (ok) return { kind: "career", career: career.id, assignment: asg.id, via: "qualified" };
  return qualifyFailed(ctx, career, retryDM);
}

async function qualifyFailed(ctx: Ctx, career: Career, retryDM: number): Promise<TermPlan> {
  const t = ctx.t;
  // Glorious Empire, GE p57: one more try at DM-1, then Landless One with SOC 0.
  if (career.setting === "glorious-empire" && t.speciesId === "ge-aslan") {
    if (retryDM === 0) {
      const opts = availableCareers(ctx).filter((c) => c.id !== career.id && c.qualification.check !== null);
      const pick = await ctx.one("Qualification failed. Try one more career at DM-1, or become a Landless One?", [
        ...opts.map((c) => {
          const out = assignmentsFor(ctx, c).every((a) => !canEverPass(ctx, (a.qualification ?? c.qualification.check)!, qualifyDM(ctx, c, a.id) + GE_RULES.qualifyFailRetryDM));
          return { label: c.name, value: c.id, detail: `Qualify ${c.qualification.check} DM-1`, ...(out ? { disabled: "Even a 12 cannot make it at DM-1" } : {}) };
        }),
        { label: "Landless One (SOC 0)", value: "ge-landless-one" },
      ], { always: true });
      if (pick !== "ge-landless-one") return qualifyFor(ctx, pick, GE_RULES.qualifyFailRetryDM);
    }
    t.stats.SOC = GE_RULES.qualifyFailSoc;
    ctx.log("No career will have you: Landless One, and SOC falls to 0.", "warn");
    return { kind: "career", career: "ge-landless-one", via: "forced" };
  }
  if (ctx.settings.setting === "glorious-empire" && career.setting === "glorious-empire") {
    return { kind: "career", career: "ge-landless-one", via: "forced" };
  }
  const opts: Option<"draft" | "drifter">[] = [{ label: "Become a Drifter", value: "drifter" }];
  if (!t.drafted) opts.unshift({ label: "Submit to the draft", value: "draft" });
  const pick = await ctx.one(`Not accepted by the ${career.name}. This term:`, opts, { always: true, hint: 0 });
  if (pick === "draft") return draft(ctx);
  return { kind: "career", career: "drifter", via: "drifter" };
}

async function chooseAssignment(ctx: Ctx, career: Career, exclude?: string, preset?: string): Promise<Assignment> {
  const list = assignmentsFor(ctx, career).filter((a) => a.id !== exclude);
  if (preset) {
    const p = career.assignments.find((a) => a.id === preset);
    if (p) return p;
  }
  return ctx.one(
    `${career.name}: choose an assignment`,
    list.map((a) => ({ label: a.name, value: a, detail: `${a.description} Survival ${a.survival}, advancement ${a.advancement}.` })),
    { always: list.length > 1, hint: bestAssignment(ctx, list) },
  );
}

function bestAssignment(ctx: Ctx, list: Assignment[]): number {
  let best = 0;
  let bestScore = -99;
  list.forEach((a, i) => {
    const s = parseCheck(a.survival)[0]!;
    const score = (s.kind === "stat" ? characteristicDM(stat(ctx.t, s.stat)) : 0) - s.target;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

// ---------------------------------------------------------------- education

async function educationTerm(ctx: Ctx, plan: TermPlan): Promise<void> {
  const t = ctx.t;
  const termNo = t.terms + 1;
  const env: Env = { term: newTermState(), where: plan.kind === "university" ? "University" : "Academy" };
  if (plan.kind === "university") {
    const d = termDM(ctx, UNIVERSITY.termDM, termNo) + (stat(t, "SOC") >= UNIVERSITY.socDM.min ? UNIVERSITY.socDM.dm : 0);
    const entry = await check(ctx, UNIVERSITY.entry, "University entry", d);
    if (!entry.pass) {
      ctx.log("Not admitted to university.", "warn");
      await careerTerm(ctx, await chooseNext(ctx, undefined, true));
      return;
    }
    startTerm(ctx, "University");
    const opts = UNIVERSITY.skills.map((s) => ({ label: s, value: s }));
    const lv1 = await ctx.one("University: choose a skill at level 1", opts, { always: true });
    const lv0 = await ctx.one("University: choose a second skill at level 0", opts.filter((o) => o.value !== lv1), { always: true });
    await applyGain(ctx, env, parseGain(`${lv1} 1`));
    await applyGain(ctx, env, parseGain(`${lv0} 0`));
    await applyGain(ctx, env, parseGain("EDU +1"));
    t.education = { kind: "university", graduated: false, honours: false, skills: [lv1, lv0], commissionUsed: false, autoEntryUsed: false };
    await rollTableRow(ctx, env, PRE_CAREER_EVENTS, "2D", "Pre-career event", "event");
    if (!env.term.noGraduate) {
      const g = await check(ctx, UNIVERSITY.graduation, "Graduation");
      if (g.pass) {
        t.education.graduated = true;
        t.education.honours = g.total >= UNIVERSITY.honours;
        ctx.log(`Graduated${t.education.honours ? " with honours" : ""}.`, "career");
        for (const s of [lv1, lv0]) {
          const ref = parseGain(s);
          if (ref.k === "skill") {
            const cur = currentLevel(ctx, ref.name, ref.spec);
            await gainSkill(ctx, env, ref.name, { ...(ref.spec ? { spec: ref.spec } : {}), level: (cur ?? 0) + 1 });
          }
        }
        await applyGain(ctx, env, parseGain("EDU +1"));
      } else ctx.log("Failed to graduate.", "warn");
    }
  } else {
    const a = ACADEMIES.find((x) => x.career === plan.career)!;
    const career = findCareer(a.career);
    const entry = await check(ctx, a.entry, `${a.name} entry`, termDM(ctx, ACADEMY.termDM, termNo));
    if (!entry.pass) {
      ctx.log(`Not admitted to the ${a.name.toLowerCase()}.`, "warn");
      await careerTerm(ctx, await chooseNext(ctx, undefined, true));
      return;
    }
    startTerm(ctx, a.name);
    const service = career.tables.find((x) => x.kind === "service")!;
    await basicTrainingAll(ctx, env, service.rows);
    t.education = { kind: "academy", career: a.career, graduated: false, honours: false, skills: [], commissionUsed: false, autoEntryUsed: false };
    await rollTableRow(ctx, env, PRE_CAREER_EVENTS, "2D", "Pre-career event", "event");
    if (!env.term.noGraduate) {
      let d = 0;
      for (const x of ACADEMY.graduationDMs) if (stat(t, x.stat) >= x.min) d += x.dm;
      const g = await check(ctx, ACADEMY.graduation, "Graduation", d);
      if (g.pass) {
        t.education.graduated = true;
        t.education.honours = g.total >= ACADEMY.honours;
        ctx.log(`Graduated${t.education.honours ? " with honours" : ""}.`, "career");
        await applyGain(ctx, env, parseGain("EDU +1"));
        if (t.education.honours) await applyGain(ctx, env, parseGain("SOC +1"));
      } else {
        t.education.autoEntryOnFail = g.total > 2;
        ctx.log(`Failed to graduate.${g.total > 2 ? ` You may still join the ${career.name} directly, without a first-term commission.` : ""}`, "warn");
      }
    }
  }
  await endTerm(ctx, env);
}

function currentLevel(ctx: Ctx, name: string, spec?: string): number | undefined {
  return skillLevel(ctx.t, name, spec);
}

function startTerm(ctx: Ctx, what: string): void {
  const t = ctx.t;
  t.terms++;
  ctx.log(`Term ${t.terms} (age ${t.age}): ${what}.`, "career");
}

/** Age four years, and from the fourth term roll for ageing. */
function endTerm(ctx: Ctx, env: Env): Promise<void> | void {
  const t = ctx.t;
  t.age += 4;
  ctx.onChange();
  if (t.terms >= AGEING_FROM_TERM) return ageingRoll(ctx, "Ageing", env);
}

/** Every skill on a basic training table at level 0 (CRB p18). Characteristic rows are skipped. */
async function basicTrainingAll(ctx: Ctx, env: Env, rows: string[]): Promise<void> {
  const t = ctx.t;
  const got: string[] = [];
  const add = (g: ReturnType<typeof parseGain>) => {
    if (g.k === "skill") {
      if (PSIONIC_TALENTS.includes(g.name)) return;
      const r = setSkill(t, g.name, undefined, 0);
      if (r.ok) got.push(`${g.name} 0`);
    } else if (g.k === "choice" || g.k === "all") for (const x of g.k === "choice" ? g.options : g.items) add(x);
  };
  for (const row of rows) add(parseGain(row));
  ctx.log(`Basic training: ${got.length ? got.join(", ") : "nothing new"}.`, "skill");
  void env;
}

/** One skill from the table at level 0, for later careers (CRB p18). */
async function basicTrainingOne(ctx: Ctx, env: Env, rows: string[]): Promise<void> {
  const t = ctx.t;
  const names = new Set<string>();
  const add = (g: ReturnType<typeof parseGain>) => {
    if (g.k === "skill" && !PSIONIC_TALENTS.includes(g.name) && !t.skills[g.name]) names.add(g.name);
    else if (g.k === "choice" || g.k === "all") for (const x of g.k === "choice" ? g.options : g.items) add(x);
  };
  for (const row of rows) add(parseGain(row));
  if (names.size === 0) {
    ctx.log("Basic training: you already know every skill on the table.", "skill");
    return;
  }
  const pick = await ctx.one("Basic training: one skill at level 0", [...names].map((n) => ({ label: `${n} 0`, value: n })), { always: true });
  setSkill(t, pick, undefined, 0);
  ctx.log(`Basic training: ${pick} 0.`, "skill");
  void env;
}

// ---------------------------------------------------------------- career term

/** Run one term in a career. Returns the career id if the Traveller left it. */
async function careerTerm(ctx: Ctx, plan: TermPlan): Promise<string | undefined> {
  const t = ctx.t;
  if (plan.kind !== "career") {
    if (plan.kind === "finish") {
      t.finished = true;
      await finish(ctx);
      return undefined;
    }
    await educationTerm(ctx, plan);
    return undefined;
  }
  const career = findCareer(plan.career!);
  let rec = currentCareer(t);
  const firstTerm = !rec || rec.careerId !== career.id || plan.via !== "continue";
  if (firstTerm) {
    const asg = plan.assignment ? career.assignments.find((a) => a.id === plan.assignment)! : await chooseAssignment(ctx, career);
    rec = {
      careerId: career.id,
      assignmentId: asg.id,
      assignments: [asg.id],
      terms: 0,
      rank: 0,
      officer: false,
      highestRank: 0,
      benefitRolls: 0,
      benefitDMs: [],
      benefitDMAll: 0,
      survivalDM: 0,
      ended: false,
      mustered: false,
      ...(plan.via === "draft" ? { drafted: true } : {}),
    };
    t.careers.push(rec);
  }
  rec = rec!;
  if (!firstTerm && plan.assignment && plan.assignment !== rec.assignmentId) {
    rec.assignmentId = plan.assignment;
    rec.assignments.push(plan.assignment);
  }
  const env: Env = { career, rec, term: newTermState(), where: career.name };

  // Anagathics (CRB p49), not in prison.
  if (career.id !== "prisoner") {
    const toPrison = await anagathics(ctx, env);
    if (toPrison) {
      if (firstTerm && rec.terms === 0) t.careers.pop();
      else {
        rec.endReason = "arrested";
        await musterOut(ctx, rec);
      }
      t.forcedNext = undefined;
      return careerTerm(ctx, { kind: "career", career: "prisoner", via: "forced" });
    }
  } else if (t.anagathics.active) {
    t.anagathics.active = false;
    ctx.log("No anagathics in prison: the supply stops.", "warn");
    await ageingRoll(ctx, "Stopping anagathics", env);
  }

  // Prisoners pick a new assignment every term (CRB p52); some events force one.
  if (!firstTerm && (career.assignmentChange === "free" || t.changeAssignment)) {
    const asg = await chooseAssignment(ctx, career, t.changeAssignment ? rec.assignmentId : undefined);
    if (asg.id !== rec.assignmentId) {
      rec.assignmentId = asg.id;
      rec.assignments.push(asg.id);
    }
    t.changeAssignment = false;
  }

  startTerm(ctx, `${career.name} (${career.assignments.find((a) => a.id === rec!.assignmentId)!.name})${rec.terms > 0 ? `, term ${rec.terms + 1} in the career` : ""}`);
  rec.terms++;
  const asg = career.assignments.find((a) => a.id === rec!.assignmentId)!;

  let skipSkillRoll = false;
  if (firstTerm) {
    const firstCareer = t.careers.length === 1;
    const basic = career.basicTraining === "assignment" ? asg.skills : career.tables.find((x) => x.kind === "service")!.rows;
    if (firstCareer) {
      await basicTrainingAll(ctx, env, basic);
      skipSkillRoll = ctx.settings.basicTrainingReplacesRoll;
    } else await basicTrainingOne(ctx, env, basic);
    // Military academy graduates entering their own service (CRB p16).
    const ed = t.education;
    if (ed?.kind === "academy" && ed.career === career.id && ed.graduated && !ed.commissionUsed) {
      const service = career.tables.find((x) => x.kind === "service")!;
      const names = new Set<string>();
      for (const row of service.rows) {
        const g = parseGain(row);
        if (g.k === "skill") names.add(g.name);
        if (g.k === "choice") for (const o of g.options) if (o.k === "skill") names.add(o.name);
      }
      const three = await ctx.many("Academy graduate: raise three Service Skills to level 1", [...names].map((n) => ({ label: n, value: n })), 3);
      for (const n of three) await gainSkill(ctx, env, n, { level: 1 });
    }
    if (rec.rank === 0) await rankBonus(ctx, env, 0);
    if (career.id === "prisoner") {
      rec.parole = Math.min(PAROLE.max, (await ctx.roll("1D", "Parole threshold")).total + PAROLE.base);
      ctx.log(`Parole threshold ${rec.parole}.`, "info");
    }
    if (career.id === "psion") {
      if (!t.psiTested) await testPsi(ctx);
      if (!PSIONIC_TALENTS.some((x) => t.skills[x])) await talentRolls(ctx);
    }
    await preCareerCommission(ctx, env);
  }

  if (!skipSkillRoll) await skillRoll(ctx, env);

  // Survival (CRB p18), twice on anagathics.
  const survChecks = t.anagathics.active ? 2 : 1;
  let survived = true;
  for (let i = 0; i < survChecks; i++) {
    const r = await check(ctx, asg.survival, `Survival${survChecks > 1 ? ` (${i + 1} of 2, anagathics)` : ""}`, rec.survivalDM + t.pending.survivalDM, { natural2Fails: true });
    if (!r.pass) survived = false;
  }
  t.pending.survivalDM = 0;

  if (!survived) {
    ctx.log("Survival failed.", "warn");
    await mishap(ctx, env, true);
    if (career.id === "prisoner") env.term.ejected = false;
  } else {
    const tables = tablesFor(career, rec.assignmentId);
    await rollTableRow(ctx, env, tables.events, "2D", `${career.name} event`, "event");
    // An event that ends in an ejecting mishap ends the term there.
    if (!(env.term.ejected && !env.term.mustContinue) || career.id === "prisoner") await advancement(ctx, env, asg);
  }

  // The term's Benefit roll.
  if (!env.term.benefitLost) rec.benefitRolls++;
  await endTerm(ctx, env);
  if (t.dead) {
    rec.ended = true;
    rec.endReason = "died";
    return career.id;
  }
  // An ageing crisis ends the career, prison included (CharSpec 11.5).
  if (env.term.crisis) {
    const prison = career.id === "prisoner";
    rec.endReason = prison ? "released on medical grounds" : "ageing crisis";
    ctx.log(prison ? "The ageing crisis gets you released on medical grounds." : `The ageing crisis ends your time in the ${career.name}.`, "career");
    await musterOut(ctx, rec);
    t.forcedNext = undefined;
    t.returnTo = undefined;
    return career.id;
  }
  return decideNext(ctx, env);
}

/** A commission before the first term, for university and academy graduates (CRB p16-17). */
async function preCareerCommission(ctx: Ctx, env: Env): Promise<void> {
  const t = ctx.t;
  const { career, rec } = env as Required<Pick<Env, "career" | "rec">> & Env;
  const ed = t.education;
  if (!ed || !career.commission || !career.military || ed.commissionUsed) return;
  if (t.careers.length !== 1) return;
  if (!ed.graduated) return;
  if (ed.kind === "academy" && ed.career !== career.id) return;
  ed.commissionUsed = true;
  let ok = false;
  if (ed.kind === "academy" && ed.honours) {
    ok = true;
    ctx.log("Academy honours: commissioned automatically.", "career");
  } else {
    const d = ed.kind === "academy" ? 2 : ed.honours ? 2 : 0;
    const go = await ctx.yes(`Graduate: attempt a commission before your first term (${career.commission}${d ? ` DM+${d}` : ""})?`, { hint: true });
    if (!go) return;
    ok = (await check(ctx, career.commission, "Commission", d)).pass;
  }
  if (ok) {
    rec.officer = true;
    rec.rank = 1;
    rec.highestRank = Math.max(rec.highestRank, 1);
    await rankBonus(ctx, env, 1);
  }
}

async function advancement(ctx: Ctx, env: Env, asg: Assignment): Promise<void> {
  const t = ctx.t;
  const career = env.career!;
  const rec = env.rec!;
  const promote = async () => {
    rec.rank++;
    rec.highestRank = Math.max(rec.highestRank, rec.rank);
    await rankBonus(ctx, env, rec.rank);
    await skillRoll(ctx, env, "Promotion");
  };
  const commission = async () => {
    rec.officer = true;
    rec.rank = 1;
    rec.highestRank = Math.max(rec.highestRank, 1);
    await rankBonus(ctx, env, 1);
    await skillRoll(ctx, env, "Commission");
  };
  if (env.term.promote) {
    if (career.id === "prisoner") {
      env.term.leave = true;
      ctx.log("Released.", "career");
    } else await promote();
    return;
  }
  if (env.term.promoteOrCommission) {
    const canCommission = career.military && !!career.commission && !rec.officer;
    if (canCommission && (await ctx.one("Promotion or commission?", [{ label: "Commission", value: true }, { label: "Promotion", value: false }], { hint: 0, always: true }))) await commission();
    else await promote();
    return;
  }
  // Commission (CRB p19): optional; first term in the career, or any term with SOC 9+.
  if (career.military && career.commission && !rec.officer && (rec.terms === 1 || stat(t, "SOC") >= 9) && !(t.education?.kind === "academy" && t.education.autoEntryOnFail && rec.terms === 1 && t.careers.length === 1)) {
    const d = -(rec.terms - 1) + t.pending.advanceDM;
    const go = await ctx.yes(`Attempt a commission (${career.commission}${d ? ` DM${sign(d)}` : ""})?`, { hint: true });
    if (go) {
      t.pending.advanceDM = 0;
      const r = await check(ctx, career.commission, "Commission", d);
      if (r.pass) {
        await commission();
        return;
      }
    }
  }
  if (rec.rank >= 6 && career.id !== "prisoner") {
    ctx.log("Already at the highest rank.", "info");
  }
  const r = await check(ctx, asg.advancement, career.id === "prisoner" ? "Parole (advancement)" : "Advancement", t.pending.advanceDM);
  t.pending.advanceDM = 0;
  if (career.id === "prisoner") {
    if (r.total > (rec.parole ?? 99)) {
      ctx.log(`Roll ${r.total} beats the parole threshold of ${rec.parole}: released.`, "career");
      env.term.leave = true;
    } else ctx.log(`Roll ${r.total} does not beat the parole threshold of ${rec.parole}.`, "info");
    if (r.pass && rec.rank < 6) await promote();
    return;
  }
  if (r.pass && rec.rank < 6) await promote();
  if (r.natural === 12) {
    env.term.mustContinue = true;
    ctx.log("A natural 12: too valuable to lose, you must continue.", "career");
  } else if (r.total <= rec.terms) {
    env.term.leave = true;
    ctx.log(`Advancement ${r.total} is no more than your ${rec.terms} term${rec.terms === 1 ? "" : "s"} here: you cannot continue in this career.`, "warn");
  }
}

/** After the term: stay, change assignment or leave. Returns the career id when leaving. */
async function decideNext(ctx: Ctx, env: Env): Promise<string | undefined> {
  const t = ctx.t;
  const career = env.career!;
  const rec = env.rec!;
  const term = env.term;
  const leave = async (why: string) => {
    rec.endReason = why;
    await musterOut(ctx, rec);
    if (t.returnTo === career.id) t.returnTo = undefined;
    return career.id;
  };
  if (t.forcedNext && t.forcedNext.career !== career.id) {
    return leave("forced out");
  }
  if (career.id === "prisoner") {
    if (term.leave) {
      await leave("released");
      if (t.returnTo && hasCareer(t.returnTo)) {
        t.forcedNext = { career: t.returnTo };
        t.returnTo = undefined;
      }
      return career.id;
    }
    return undefined;
  }
  if (term.ejected && !term.mustContinue) return leave("ejected after a mishap");
  if (term.leave && !term.mustContinue) return leave(term.mishap ? "left after a mishap" : "could not continue");
  if (term.mustContinue) {
    ctx.log(`You continue in the ${career.name}.`, "career");
    return undefined;
  }
  const others = assignmentsFor(ctx, career).filter((a) => a.id !== rec.assignmentId);
  const opts: Option<"stay" | "change" | "leave" | "retire">[] = [
    { label: `Continue in the ${career.name}`, value: "stay" },
    ...(others.length > 0 && career.assignmentChange !== "free" ? [{ label: "Change assignment", value: "change" as const, detail: career.assignmentChange === "newCareer" ? "Counts as a new career: muster out, then qualify (CRB p20)." : "Roll to qualify; keep your rank (CRB p20)." }] : []),
    { label: "Leave and try another career", value: "leave" },
    { label: "Leave and start adventuring", value: "retire" },
  ];
  const hint = t.terms >= hintTerms(ctx) ? 3 : 0;
  const pick = await ctx.one(`End of term ${t.terms}, age ${t.age}. What now?`, opts, { hint, always: true });
  if (pick === "stay") return undefined;
  if (pick === "change") {
    const asg = await chooseAssignment(ctx, career, rec.assignmentId);
    if (career.assignmentChange === "newCareer") {
      await leave("changed assignment");
      const q = career.qualification.check;
      const ok = q === null ? true : (await check(ctx, q, `Qualify for ${career.name} (${asg.name})`, qualifyDM(ctx, career, asg.id))).pass;
      if (ok) {
        t.forcedNext = { career: career.id, assignment: asg.id };
        // A new record starts next term: forcedPlan treats it as a fresh entry since the old one has ended.
        return undefined;
      }
      const fb = await qualifyFailed(ctx, career, 0);
      t.forcedNext = { career: fb.career!, ...(fb.assignment ? { assignment: fb.assignment } : {}) };
      return career.id;
    }
    const q = career.qualification.check;
    const ok = q === null ? true : (await check(ctx, q, `Change to ${asg.name}`, qualifyDM(ctx, career, asg.id))).pass;
    if (ok) {
      rec.assignmentId = asg.id;
      rec.assignments.push(asg.id);
      ctx.log(`New assignment: ${asg.name}.`, "career");
    } else ctx.log("The change is refused; you continue as before.", "info");
    return undefined;
  }
  const id = await leave("left");
  if (pick === "retire") t.finished = true;
  return id;
}

// ---------------------------------------------------------------- ageing and anagathics

/** Returns true if obtaining anagathics sends the Traveller to prison this term. */
async function anagathics(ctx: Ctx, env: Env): Promise<boolean> {
  const t = ctx.t;
  if (t.anagathics.active) {
    const keep = await ctx.yes(`Continue anagathics this term? (1D x ${fmt(ANAGATHICS.costPerDie)}, two survival rolls)`, { hint: true });
    if (!keep) {
      t.anagathics.active = false;
      ctx.log("You stop taking anagathics.", "info");
      await ageingRoll(ctx, "Stopping anagathics", env);
      return false;
    }
  } else {
    if (t.terms < 3) return false;
    const start = await ctx.yes("Start taking anagathics this term? (SOC 10+ to find a supply; 1D x Cr25,000 a term; two survival rolls)", { hint: false });
    if (!start) return false;
    const r = await check(ctx, ANAGATHICS.check, "Obtain anagathics");
    if (r.natural === 2) {
      ctx.log("Caught trying to buy anagathics: straight to prison.", "warn");
      return true;
    }
    if (!r.pass) return false;
    t.anagathics.active = true;
    t.anagathics.everUsed = true;
  }
  const cost = (await ctx.roll("1D", "Anagathics cost")).total * ANAGATHICS.costPerDie;
  t.debt += cost;
  t.anagathics.terms++;
  ctx.log(`Anagathics this term: ${fmt(cost)} owed.`, "info");
  return false;
}

/** Roll for ageing. A crisis is marked on the term, which then ends the career. */
async function ageingRoll(ctx: Ctx, label: string, env: Env): Promise<void> {
  const t = ctx.t;
  const r = (await ctx.roll("2D", label)).total;
  const dmAge = -t.terms + (t.anagathics.active ? t.anagathics.terms : 0);
  const total = r + dmAge;
  const eff = ageingEffect(total);
  ctx.log(`${label}: rolled ${r} ${sign(dmAge)} = ${total}${eff.physical.length + eff.mental.length === 0 ? ": no effect." : "."}`, "roll");
  if (eff.physical.length > 0) {
    const pool = [...PHYSICAL];
    for (const amount of [...eff.physical].sort((a, b) => b - a)) {
      const s = pool.length === 1 ? pool[0]! : await ctx.one(`Ageing: reduce which physical characteristic by ${amount}?`, pool.map((x) => ({ label: `${x} (${stat(t, x)})`, value: x })), { hint: highestIndex(t, pool) });
      pool.splice(pool.indexOf(s), 1);
      t.stats[s] = Math.max(0, stat(t, s) - amount);
      ctx.log(`Ageing: ${s} -${amount} (now ${t.stats[s]}).`, "warn");
    }
  }
  for (const amount of eff.mental) {
    const mental = MENTAL.filter((x) => x !== "SOC");
    const s = await ctx.one(`Ageing: reduce which mental characteristic by ${amount}?`, mental.map((x) => ({ label: `${x} (${stat(t, x)})`, value: x })), { hint: highestIndex(t, mental) });
    t.stats[s] = Math.max(0, stat(t, s) - amount);
    ctx.log(`Ageing: ${s} -${amount} (now ${t.stats[s]}).`, "warn");
  }
  const zero = (Object.keys(t.stats) as Stat[]).filter((s) => s !== "PSI" && t.stats[s] === 0 && PHYSICAL.concat(MENTAL).includes(s));
  if (zero.length > 0 && (eff.physical.length > 0 || eff.mental.length > 0)) {
    const cost = (await ctx.roll("1D", "Ageing crisis care")).total * AGEING_CRISIS_COST;
    t.debt += cost;
    for (const s of zero) t.stats[s] = 1;
    t.ageingCrisis = true;
    env.term.crisis = true;
    ctx.log(`Ageing crisis: medical care costs ${fmt(cost)} and brings ${zero.join(", ")} back to 1. Every qualification roll fails from now on.`, "warn");
  }
  ctx.onChange();
}

/** The highest of `list`, which ageing should hit first. */
function highestIndex(t: Traveller, list: readonly Stat[]): number {
  let best = 0;
  list.forEach((s, i) => {
    if (stat(t, s) > stat(t, list[best]!)) best = i;
  });
  return best;
}

// ---------------------------------------------------------------- finishing

async function finish(ctx: Ctx): Promise<void> {
  const t = ctx.t;
  const cur = currentCareer(t);
  if (cur) {
    cur.endReason = cur.endReason ?? "left to travel";
    await musterOut(ctx, cur);
  }
  if (t.history.some((h) => h.text.startsWith("Ready to travel"))) return;
  const env: Env = { term: newTermState(), where: "Finishing" };

  // Skills package (CRB p50), shared among the group.
  if (ctx.settings.groupSize > 0) {
    const pkg = await ctx.one(
      "Choose the group's skills package",
      [
        ...SKILL_PACKAGES.map((p) => ({ label: p.name, value: p.id, detail: `${p.text} ${p.skills.map((s) => `${s} 1`).join(", ")}` })),
        { label: "No package", value: "" },
      ],
      { always: true },
    );
    if (pkg) {
      const p = SKILL_PACKAGES.find((x) => x.id === pkg)!;
      t.skillPackage = p.name;
      const share = Math.ceil(p.skills.length / Math.max(1, ctx.settings.groupSize));
      const picks = await ctx.many(
        `${p.name} package: pick your ${share} skill${share === 1 ? "" : "s"} (the group shares ${p.skills.length})`,
        p.skills.map((s, i) => ({ label: `${s} 1`, value: i, ...(alreadyAtLeast(ctx, s, 1) ? { detail: "you already have this at 1+" } : {}) })),
        share,
      );
      for (const i of picks) {
        const g = parseGain(`${p.skills[i]} 1`);
        await applyGain(ctx, env, g);
      }
    }
  }

  // Connections (CRB p19).
  const n = await ctx.number(`Connections: how many other Travellers did you link events with? (0 to ${CONNECTIONS.max})`, 0, CONNECTIONS.max, { hint: 0 });
  for (let i = 0; i < n; i++) {
    t.connections++;
    await anySkill(ctx, env, undefined, CONNECTIONS.except, CONNECTIONS.maxLevel);
  }

  // Psionic institute training (CRB p228) for a tested Traveller outside the Psion career.
  if (ctx.settings.psionics && t.psiTested && (t.stats.PSI ?? 0) > 0 && !PSIONIC_TALENTS.some((x) => t.skills[x])) {
    const go = await ctx.yes(`Pay an institute ${fmt(PSIONICS.trainingCost)} to train your talents?`, { hint: false });
    if (go) {
      t.debt += PSIONICS.trainingCost;
      await talentRolls(ctx);
    }
  }

  // Debts from medical care and anagathics come out of cash (CRB p52).
  if (t.debt > 0) {
    const paid = Math.min(t.cash, t.debt);
    t.cash -= paid;
    t.debt -= paid;
    ctx.log(`Debts paid from cash: ${fmt(paid)}.${t.debt > 0 ? ` Still owed: ${fmt(t.debt)}.` : ""}`, t.debt > 0 ? "warn" : "info");
  }
  ctx.log(`Ready to travel at age ${t.age}.`, "career");
}

function alreadyAtLeast(ctx: Ctx, text: string, level: number): boolean {
  const g = parseGain(text);
  if (g.k !== "skill") return false;
  const lv = skillLevel(ctx.t, g.name, g.spec);
  return lv !== undefined && lv >= level && (!hasSpecialities(g.name) || g.spec !== undefined);
}

export { findSkill, applyEffects };
