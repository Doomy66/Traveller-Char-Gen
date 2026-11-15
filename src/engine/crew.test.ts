import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "./context";
import { crewLevel, rollCrewMember } from "./crew";
import { seededRandom } from "./dice";
import { findCareer, hasCareer } from "../rules/careers/index";
import { CREW_POSITIONS, CREW_PRESETS, crewSalary, findPosition } from "../rules/crew";
import { findSkill } from "../rules/skills";

/** CharSpec 12. */

const seedsFrom = (n: number) => {
  const r = seededRandom(n);
  return () => Math.floor(r() * 2 ** 32);
};

describe("crew data", () => {
  it("names real skills, specialities, careers and assignments", () => {
    for (const p of CREW_POSITIONS) {
      for (const s of p.skills) {
        const def = findSkill(s.skill);
        expect(def, `${p.id} ${s.skill}`).toBeDefined();
        if (s.spec) expect(def!.specialities, `${p.id} ${s.skill} (${s.spec})`).toContain(s.spec);
      }
      for (const ref of p.careers) {
        const [cid, aid] = ref.split("/") as [string, string | undefined];
        expect(hasCareer(cid), `${p.id} ${ref}`).toBe(true);
        if (aid) expect(findCareer(cid).assignments.map((a) => a.id), `${p.id} ${ref}`).toContain(aid);
      }
    }
  });

  it("presets use known posts", () => {
    for (const pr of CREW_PRESETS) for (const id of Object.keys(pr.counts)) expect(() => findPosition(id), `${pr.name} ${id}`).not.toThrow();
  });

  it("pays the table's salary at level 1 and half as much again per level above", () => {
    const pilot = findPosition("pilot");
    expect(crewSalary(pilot, 0)).toBe(6000);
    expect(crewSalary(pilot, 1)).toBe(6000);
    expect(crewSalary(pilot, 2)).toBe(9000);
    expect(crewSalary(pilot, 3)).toBe(12000);
  });
});

describe("rolling a crew", () => {
  const core: Settings = { ...DEFAULT_SETTINGS, setting: "core" };
  const ge: Settings = { ...DEFAULT_SETTINGS, setting: "glorious-empire" };

  it("fills every post at level 1 in the Third Imperium", async () => {
    for (const [i, p] of CREW_POSITIONS.entries()) {
      const m = await rollCrewMember(p, 1, core, "human", seedsFrom(100 + i));
      expect(m.met, p.id).toBe(true);
      expect(m.t.finished, p.id).toBe(true);
      expect(crewLevel(m.t, p)).toBeGreaterThanOrEqual(1);
    }
  }, 120000);

  it("fills every post at level 1 with Aslan of the Glorious Empire", async () => {
    for (const [i, p] of CREW_POSITIONS.entries()) {
      const m = await rollCrewMember(p, 1, ge, "ge-aslan", seedsFrom(200 + i));
      expect(m.met, p.id).toBe(true);
    }
  }, 120000);

  it("finds level 2 pilots and engineers", async () => {
    for (const id of ["pilot", "engineer", "medic"]) {
      const m = await rollCrewMember(findPosition(id), 2, core, "human", seedsFrom(300));
      expect(m.met, id).toBe(true);
      expect(m.level).toBeGreaterThanOrEqual(2);
    }
  }, 120000);

  it("settles for the best when the level cannot be reached", async () => {
    const m = await rollCrewMember(findPosition("captain"), 4, core, "human", seedsFrom(400), 3);
    expect(m.tries).toBe(3);
    if (!m.met) expect(m.level).toBeLessThan(4);
  }, 60000);

  it("rolls the same crew member from the same seeds", async () => {
    const a = await rollCrewMember(findPosition("astrogator"), 1, core, "human", seedsFrom(7));
    const b = await rollCrewMember(findPosition("astrogator"), 1, core, "human", seedsFrom(7));
    expect(b.t.name).toBe(a.t.name);
    expect(b.t.history).toEqual(a.t.history);
  }, 60000);
});

describe("NPC specialities", () => {
  it("are not always the first in the list", async () => {
    const { makeNpc } = await import("./npc");
    const seen = new Map<string, Set<string>>();
    for (let s = 1; s <= 150; s++) {
      const t = await makeNpc(DEFAULT_SETTINGS, "human", s * 104729);
      for (const [name, st] of Object.entries(t.skills)) for (const [spec, lv] of Object.entries(st.specs)) if (lv >= 1) (seen.get(name) ?? seen.set(name, new Set()).get(name)!).add(spec);
    }
    for (const name of ["Gun Combat", "Pilot", "Electronics", "Engineer"]) expect(seen.get(name)?.size ?? 0, name).toBeGreaterThanOrEqual(3);
  }, 60000);
});

describe("a post's narrower skill", () => {
  it("rolls marines with the Gun Combat speciality asked for", async () => {
    const { crewVariant } = await import("../rules/crew");
    const { skillLevel } = await import("./character");
    const marine = findPosition("marine");
    for (const [i, spec] of ["archaic", "energy", "slug"].entries()) {
      const p = crewVariant(marine, i + 1);
      expect(p.skills).toEqual([{ skill: "Gun Combat", spec }]);
      const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(500 + i));
      expect(m.met, spec).toBe(true);
      expect(skillLevel(m.t, "Gun Combat", spec)).toBeGreaterThanOrEqual(1);
      expect(m.post).toBe(p);
    }
    expect(crewVariant(marine, 0)).toBe(marine);
  }, 60000);
});
