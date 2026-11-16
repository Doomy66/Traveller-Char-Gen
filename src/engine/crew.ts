import { skillLevel, type CareerRecord, type Traveller } from "./character";
import { randomAnswerer, type Answerer, type Ask, type AskOption, type Settings } from "./context";
import { makeNpc } from "./npc";
import { findCareer, hasCareer } from "../rules/careers/index";
import { CREW_POSITIONS, crewSkillText, skillGroups, type CrewPosition, type CrewSkill, type ServiceNeed } from "../rules/crew";

/**
 * Rolling a ship's crew. CharSpec 12.
 *
 * Each post is filled by rolling NPCs by the ordinary rules until one has the
 * post's skill at the level asked for. The NPC is not made to order: an
 * answerer steers the choices a player hoping for the job would make (the
 * careers and assignments that teach it, the skill tables and specialities
 * that hold it, staying in until it is learned), and the dice do the rest.
 */

/** The NPC's best level among some skills, -1 if untrained in all. */
export function groupLevel(t: Traveller, group: CrewSkill[]): number {
  let best = -1;
  for (const s of group) {
    const lv = skillLevel(t, s.skill, s.spec);
    if (lv !== undefined && lv > best) best = lv;
  }
  return best;
}

/** The NPC's level for a post: the best of its skills, or for two jobs the lower of the two. */
export function crewLevel(t: Traveller, p: CrewPosition): number {
  return Math.min(...skillGroups(p).map((g) => groupLevel(t, g)));
}

/**
 * The NPC's record in the service, if they ended creation serving in it
 * (their last career is one of the service's), commissioned where the post
 * needs it. CharSpec 12.6.
 */
export function serviceRecord(t: Traveller, need: ServiceNeed): CareerRecord | undefined {
  const last = t.careers[t.careers.length - 1];
  if (!last || !need.careers.includes(last.careerId)) return undefined;
  // Unbroken service: once in, no other career since (CharSpec 12.6.1).
  const first = t.careers.findIndex((c) => need.careers.includes(c.careerId));
  if (t.careers.slice(first).some((c) => !need.careers.includes(c.careerId))) return undefined;
  const commissions = hasCareer(last.careerId) && !!findCareer(last.careerId).commission;
  if (need.commissioned && commissions && !last.officer) return undefined;
  // A rank asked for is on the post's own ladder: officer ranks for officers, enlisted ranks for the rest.
  if (need.minRank > 0 && (last.rank < need.minRank || (commissions && last.officer !== need.commissioned))) return undefined;
  return last;
}

/** Other posts the NPC could take at level 1 or better. */
export function otherPosts(t: Traveller, except: string): CrewPosition[] {
  return CREW_POSITIONS.filter((p) => p.id !== except && crewLevel(t, p) >= 1);
}

/** The most terms a crew NPC serves while chasing the skill, to keep them young enough to hire. */
export const CREW_MAX_TERMS = 7;

/** An answerer that makes the choices someone wanting the post would make. */
export function crewAnswerer(t: Traveller, random: () => number, p: CrewPosition, min: number, need?: ServiceNeed): Answerer {
  const base = randomAnswerer(random);
  const careerIds = new Set<string>();
  const careerNames = new Set<string>();
  const careerIdByName = new Map<string, string>();
  const assignmentNames = new Set<string>();
  // In a service only its careers count; the post's assignments within them still steer.
  for (const cid of need?.careers ?? []) {
    if (!hasCareer(cid)) continue;
    careerIds.add(cid);
    careerNames.add(findCareer(cid).name);
    careerIdByName.set(findCareer(cid).name, cid);
  }
  for (const ref of p.careers) {
    const [cid, aid] = ref.split("/") as [string, string | undefined];
    if (!hasCareer(cid) || (need && !careerIds.has(cid))) continue;
    const c = findCareer(cid);
    careerIds.add(cid);
    careerNames.add(c.name);
    const a = aid ? c.assignments.find((x) => x.id === aid) : undefined;
    if (a) assignmentNames.add(a.name);
  }
  // A service crew member leaves as soon as the job and rank are theirs, after one to three terms; others after two to four.
  const stopAfter = (need ? 1 : 2) + Math.floor(random() * 3);
  const serving = () => {
    const cur = t.careers[t.careers.length - 1];
    return !!cur && !cur.ended && careerIds.has(cur.careerId);
  };
  const enrolled = () => !need || (serving() && !!serviceRecord(t, need));
  const ready = () => t.terms >= CREW_MAX_TERMS || (crewLevel(t, p) >= min && t.terms >= stopAfter && enrolled());
  const wanted = skillGroups(p).flat();
  const exact = wanted.map(crewSkillText);
  const names = [...new Set(wanted.map((s) => s.skill))].map((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
  const score = (o: AskOption): number => {
    const text = `${o.label} ${o.detail ?? ""}`;
    let s = 0;
    for (const e of exact) if (text.includes(e)) s += 3;
    for (const re of names) if (re.test(text)) s += 1;
    return s;
  };
  const randomOf = (xs: number[]): number => xs[Math.floor(random() * xs.length)]!;
  const isFinish = (label: string) => /^(Finish|Start adventuring)/.test(label);

  return {
    async ask(a: Ask): Promise<number[]> {
      const enabled = a.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      const label = (i: number) => a.options[i]!.label;
      if (a.kind === "one") {
        if (/what next\?$|must try a career/.test(a.prompt)) {
          // A service NPC who has left their service career (ejected, or out at the end of a term)
          // stops there: no other career, not even a return. The one move allowed is on to another
          // of the service's careers not yet served in, such as Fleet to Fleet Officer. If that
          // qualification fails, whatever follows makes the NPC unfit and another is rolled.
          if (need && !serving() && t.careers.some((c) => careerIds.has(c.careerId))) {
            const served = new Set(t.careers.map((c) => c.careerId));
            const onward = enabled.filter((i) => {
              const id = careerIdByName.get(label(i));
              return id !== undefined && need.careers.includes(id) && !served.has(id);
            });
            if (onward.length && !ready()) return [randomOf(onward)];
            const f = enabled.find((i) => isFinish(label(i)));
            if (f !== undefined) return [f];
          }
          if (ready()) {
            const f = enabled.find((i) => isFinish(label(i)));
            if (f !== undefined) return [f];
            return base.ask(a);
          }
          const pref = enabled.filter((i) => careerNames.has(label(i)));
          if (pref.length) return [randomOf(pref)];
          const hinted = await base.ask(a);
          if (!isFinish(label(hinted[0]!))) return hinted;
          const careers = enabled.filter((i) => !isFinish(label(i)));
          return careers.length ? [randomOf(careers)] : hinted;
        }
        if (/^End of term/.test(a.prompt)) {
          const find = (re: RegExp) => enabled.find((i) => re.test(label(i)));
          const current = t.careers[t.careers.length - 1]?.careerId;
          const pick = ready() ? find(/^Leave and start/) : current && careerIds.has(current) ? find(/^Continue/) : (find(/^Leave and try another/) ?? find(/^Continue/));
          return pick !== undefined ? [pick] : base.ask(a);
        }
        if (/choose an assignment$/.test(a.prompt)) {
          const pref = enabled.filter((i) => assignmentNames.has(label(i)));
          if (pref.length) return [randomOf(pref)];
          return base.ask(a);
        }
        const scored = enabled.map((i) => ({ i, s: score(a.options[i]!) })).filter((x) => x.s > 0);
        if (scored.length) {
          const top = Math.max(...scored.map((x) => x.s));
          return [randomOf(scored.filter((x) => x.s === top).map((x) => x.i))];
        }
        return base.ask(a);
      }
      if (a.kind === "many") {
        const n = a.count ?? 1;
        const scored = enabled
          .map((i) => ({ i, s: score(a.options[i]!) }))
          .filter((x) => x.s > 0)
          .sort((x, y) => y.s - x.s)
          .map((x) => x.i)
          .slice(0, n);
        if (scored.length >= n) return scored;
        const rest = (await base.ask(a)).filter((i) => !scored.includes(i));
        return [...scored, ...rest].slice(0, n);
      }
      return base.ask(a);
    },
  };
}

export interface CrewMember {
  position: string;
  /** The service asked for, if any, and the record that shows the NPC serving in it. */
  need?: ServiceNeed;
  record?: CareerRecord;
  /** The post as asked for, with any narrower skill chosen. */
  post: CrewPosition;
  /** The level asked for. */
  min: number;
  t: Traveller;
  level: number;
  /** The NPC reached the level asked for. */
  met: boolean;
  /** NPCs rolled to find this one. */
  tries: number;
}

/** How many NPCs to roll for one post before settling for the best of them. */
export const CREW_TRIES = 40;

/** Once a service NPC qualifies only by serving all seven terms, this many more are tried for a younger one. */
export const CREW_YOUNGER_TRIES = 10;

/**
 * Fill one post. `nextSeed` gives a fresh seed per NPC tried, so a seeded
 * source makes the whole crew repeatable. Returns the first NPC at the level,
 * or the best found if none got there.
 */
export async function rollCrewMember(p: CrewPosition, min: number, settings: Settings, species: string, nextSeed: () => number, tries = CREW_TRIES, need?: ServiceNeed): Promise<CrewMember> {
  let best: CrewMember | undefined;
  // Serving in the service matters more than the skill level when settling for the best.
  const worth = (m: CrewMember) => {
    if (!need) return m.level;
    const last = m.t.careers[m.t.careers.length - 1];
    const serving = !!last && need.careers.includes(last.careerId);
    return (m.record ? 0 : serving ? -50 : -100) + (serving ? last!.rank : 0) + m.level;
  };
  // A service NPC who only got there by serving all seven terms (age 46) is
  // kept as a fallback while a few more are tried for someone younger.
  let fallback: CrewMember | undefined;
  let lastTry = tries;
  for (let i = 1; i <= lastTry; i++) {
    const t = await makeNpc(settings, species, nextSeed(), (tt, r) => crewAnswerer(tt, r, p, min, need));
    const level = crewLevel(t, p);
    const record = need ? serviceRecord(t, need) : undefined;
    const m: CrewMember = { position: p.id, post: p, min, t, level, met: level >= min && (!need || !!record), tries: i, ...(need ? { need } : {}), ...(record ? { record } : {}) };
    if (m.met) {
      if (!need || t.terms < CREW_MAX_TERMS) return m;
      if (!fallback || t.age < fallback.t.age) fallback = m;
      lastTry = Math.min(lastTry, i + CREW_YOUNGER_TRIES);
      continue;
    }
    if (!best || worth(m) > worth(best)) best = m;
  }
  if (fallback) return { ...fallback, tries: lastTry };
  return { ...best!, tries };
}
