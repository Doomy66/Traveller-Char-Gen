import { skillLevel, type Traveller } from "./character";
import { randomAnswerer, type Answerer, type Ask, type AskOption, type Settings } from "./context";
import { makeNpc } from "./npc";
import { findCareer, hasCareer } from "../rules/careers/index";
import { CREW_POSITIONS, crewSkillText, type CrewPosition } from "../rules/crew";

/**
 * Rolling a ship's crew. CharSpec 12.
 *
 * Each post is filled by rolling NPCs by the ordinary rules until one has the
 * post's skill at the level asked for. The NPC is not made to order: an
 * answerer steers the choices a player hoping for the job would make (the
 * careers and assignments that teach it, the skill tables and specialities
 * that hold it, staying in until it is learned), and the dice do the rest.
 */

/** The NPC's level for a post: the best of its skills, -1 if untrained in all. */
export function crewLevel(t: Traveller, p: CrewPosition): number {
  let best = -1;
  for (const s of p.skills) {
    const lv = skillLevel(t, s.skill, s.spec);
    if (lv !== undefined && lv > best) best = lv;
  }
  return best;
}

/** Other posts the NPC could take at level 1 or better. */
export function otherPosts(t: Traveller, except: string): CrewPosition[] {
  return CREW_POSITIONS.filter((p) => p.id !== except && crewLevel(t, p) >= 1);
}

/** The most terms a crew NPC serves while chasing the skill, to keep them young enough to hire. */
export const CREW_MAX_TERMS = 7;

/** An answerer that makes the choices someone wanting the post would make. */
export function crewAnswerer(t: Traveller, random: () => number, p: CrewPosition, min: number): Answerer {
  const base = randomAnswerer(random);
  const careerIds = new Set<string>();
  const careerNames = new Set<string>();
  const assignmentNames = new Set<string>();
  for (const ref of p.careers) {
    const [cid, aid] = ref.split("/") as [string, string | undefined];
    if (!hasCareer(cid)) continue;
    const c = findCareer(cid);
    careerIds.add(cid);
    careerNames.add(c.name);
    const a = aid ? c.assignments.find((x) => x.id === aid) : undefined;
    if (a) assignmentNames.add(a.name);
  }
  const stopAfter = 2 + Math.floor(random() * 3);
  const ready = () => t.terms >= CREW_MAX_TERMS || (crewLevel(t, p) >= min && t.terms >= stopAfter);
  const exact = p.skills.map(crewSkillText);
  const names = [...new Set(p.skills.map((s) => s.skill))].map((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`));
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
  /** The post as asked for, with any narrower skill chosen. */
  post: CrewPosition;
  t: Traveller;
  level: number;
  /** The NPC reached the level asked for. */
  met: boolean;
  /** NPCs rolled to find this one. */
  tries: number;
}

/** How many NPCs to roll for one post before settling for the best of them. */
export const CREW_TRIES = 40;

/**
 * Fill one post. `nextSeed` gives a fresh seed per NPC tried, so a seeded
 * source makes the whole crew repeatable. Returns the first NPC at the level,
 * or the best found if none got there.
 */
export async function rollCrewMember(p: CrewPosition, min: number, settings: Settings, species: string, nextSeed: () => number, tries = CREW_TRIES): Promise<CrewMember> {
  let best: CrewMember | undefined;
  for (let i = 1; i <= tries; i++) {
    const t = await makeNpc(settings, species, nextSeed(), (tt, r) => crewAnswerer(tt, r, p, min));
    const level = crewLevel(t, p);
    const m: CrewMember = { position: p.id, post: p, t, level, met: level >= min, tries: i };
    if (m.met) return m;
    if (!best || level > best.level) best = m;
  }
  return { ...best!, tries };
}
