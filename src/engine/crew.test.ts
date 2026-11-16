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
      for (const s of [...p.skills, ...(p.also ?? []).flat(), ...(p.options ?? []).flatMap((o) => o.skills)]) {
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

  it("rolls engineers with the Engineer speciality asked for", async () => {
    const { crewVariant } = await import("../rules/crew");
    const { skillLevel } = await import("./character");
    const engineer = findPosition("engineer");
    for (const [i, spec] of ["j-drive", "m-drive", "power", "life support"].entries()) {
      const p = crewVariant(engineer, i + 1);
      expect(p.skills).toEqual([{ skill: "Engineer", spec }]);
      const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(800 + i));
      expect(m.met, spec).toBe(true);
      expect(skillLevel(m.t, "Engineer", spec)).toBeGreaterThanOrEqual(1);
    }
  }, 60000);

  it("rolls gunners with the Gunner speciality asked for", async () => {
    const { crewVariant } = await import("../rules/crew");
    const { skillLevel } = await import("./character");
    const gunner = findPosition("gunner");
    for (const [i, spec] of ["turret", "ortillery", "screen", "capital"].entries()) {
      const p = crewVariant(gunner, i + 1);
      expect(p.skills).toEqual([{ skill: "Gunner", spec }]);
      const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(700 + i));
      expect(m.met, spec).toBe(true);
      expect(skillLevel(m.t, "Gunner", spec)).toBeGreaterThanOrEqual(1);
    }
  }, 60000);

  it("rolls captains with Leadership, Tactics (naval), Broker or Admin, or the one asked for", async () => {
    const { crewVariant } = await import("../rules/crew");
    const { skillLevel } = await import("./character");
    const captain = findPosition("captain");
    expect(captain.skills.map((s) => s.skill)).toEqual(["Leadership", "Tactics", "Broker", "Admin"]);
    for (const [i, skill] of ["Leadership", "Tactics", "Broker", "Admin"].entries()) {
      const m = await rollCrewMember(crewVariant(captain, i + 1), 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(600 + i));
      expect(m.met, skill).toBe(true);
      expect(skillLevel(m.t, skill, skill === "Tactics" ? "naval" : undefined)).toBeGreaterThanOrEqual(1);
    }
  }, 60000);
});

describe("a service's crew", () => {
  it("fills every post with someone serving in the Navy, officers commissioned and marines from the Marines", async () => {
    const { CREW_POSITIONS, findService, serviceNeed } = await import("../rules/crew");
    const navy = findService("navy")!;
    for (const [i, p] of CREW_POSITIONS.entries()) {
      const need = serviceNeed(navy, p);
      const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(900 + i), 40, need);
      expect(m.met, p.id).toBe(true);
      const last = m.t.careers[m.t.careers.length - 1]!;
      expect(last.careerId, p.id).toBe(p.id === "marine" ? "marine" : "navy");
      expect(m.record).toBe(last);
      if (p.id === "captain" || p.id === "officer") expect(last.officer, p.id).toBe(true);
    }
  }, 120000);

  it("takes Aslan Fleet captains from the Fleet Officer career", async () => {
    const { findService, serviceNeed } = await import("../rules/crew");
    const fleet = findService("ge-fleet")!;
    const captain = findPosition("captain");
    const m = await rollCrewMember(captain, 1, { ...DEFAULT_SETTINGS, setting: "glorious-empire" }, "ge-aslan", seedsFrom(950), 40, serviceNeed(fleet, captain));
    expect(m.met).toBe(true);
    expect(m.record?.careerId).toBe("ge-fleet-officer");
  }, 60000);
});

describe("a minimum rank", () => {
  it("finds Navy captains of O4 or better and gunners of rank 2 or better", async () => {
    const { findService, serviceNeed } = await import("../rules/crew");
    const navy = findService("navy")!;
    const captain = findPosition("captain");
    const c = await rollCrewMember(captain, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(1000), 40, serviceNeed(navy, captain, 4));
    expect(c.met).toBe(true);
    expect(c.record!.officer).toBe(true);
    expect(c.record!.rank).toBeGreaterThanOrEqual(4);
    const gunner = findPosition("gunner");
    const g = await rollCrewMember(gunner, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(1001), 40, serviceNeed(navy, gunner, 2));
    expect(g.met).toBe(true);
    expect(g.record!.officer).toBe(false);
    expect(g.record!.rank).toBeGreaterThanOrEqual(2);
  }, 120000);

  it("labels ranks from the service's own table", async () => {
    const { findService, serviceNeed, rankLabels } = await import("../rules/crew");
    const navy = findService("navy")!;
    expect(rankLabels(serviceNeed(navy, findPosition("captain")))[4]).toMatch(/^O4 /);
    expect(rankLabels(serviceNeed(navy, findPosition("gunner")))[1]).toBe("1 Able Spacehand");
    expect(rankLabels(serviceNeed(navy, findPosition("marine")))[0]).toBe("any");
  });
});

describe("posts for one person doing two jobs", () => {
  it("need both skills at the level", async () => {
    const { groupLevel } = await import("./crew");
    const { skillGroups } = await import("../rules/crew");
    for (const [i, id] of ["pilot-astrogator", "astrogator-engineer", "captain-pilot"].entries()) {
      const p = findPosition(id);
      expect(skillGroups(p).length, id).toBe(2);
      const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(1100 + i));
      expect(m.met, id).toBe(true);
      for (const g of skillGroups(p)) expect(groupLevel(m.t, g), id).toBeGreaterThanOrEqual(1);
    }
  }, 120000);

  it("fill Scientist and Small craft crew posts", async () => {
    for (const [i, id] of ["scientist", "small-craft-crew"].entries()) {
      const m = await rollCrewMember(findPosition(id), 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(1200 + i));
      expect(m.met, id).toBe(true);
    }
  }, 60000);
});

describe("Ship Designer ships", () => {
  it("list every catalogue ship with crew in known posts", async () => {
    const { DESIGNER_SHIPS } = await import("../rules/ship-designs");
    const { CREW_POSITIONS } = await import("../rules/crew");
    const posts = new Set(CREW_POSITIONS.map((p) => p.id));
    expect(DESIGNER_SHIPS.length).toBeGreaterThanOrEqual(40);
    for (const s of DESIGNER_SHIPS) {
      expect(Object.values(s.counts).reduce((a, b) => a + b, 0), s.name).toBeGreaterThan(0);
      for (const k of Object.keys(s.counts)) expect(posts.has(k), `${s.name} ${k}`).toBe(true);
    }
  });

  it("read a .ship file with the designer's own engine, matching the generated list", async () => {
    const { crewFromDesign } = await import("../ui/ship-import");
    const { DESIGNER_SHIPS } = await import("../rules/ship-designs");
    const v = await import("../vendor/ship-designer.js");
    for (const d of [v.SCOUT_COURIER, v.FREE_TRADER, v.PATROL_CORVETTE, v.DESTROYER_ESCORT]) {
      const got = crewFromDesign(JSON.stringify(d));
      expect(got.counts, d.name).toEqual(DESIGNER_SHIPS.find((s) => s.name === d.name)!.counts);
    }
    expect(() => crewFromDesign("{}")).toThrow();
  });
});

describe("a service crew's age", () => {
  it("is mostly in the twenties and thirties", async () => {
    const { findService, serviceNeed } = await import("../rules/crew");
    const navy = findService("navy")!;
    const ages: number[] = [];
    for (const [i, id] of ["pilot", "engineer", "gunner", "medic"].entries())
      for (let k = 0; k < 8; k++) {
        const p = findPosition(id);
        const need = serviceNeed(navy, p);
        const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS }, "human", seedsFrom(1300 + i * 10 + k), 40, need);
        expect(m.met).toBe(true);
        ages.push(m.t.age);
      }
    expect(ages.reduce((a, b) => a + b, 0) / ages.length).toBeLessThan(33);
  }, 120000);
});

describe("leaving the service", () => {
  it("ends creation: no career follows the service", async () => {
    const { findService, serviceNeed } = await import("../rules/crew");
    for (const svc of ["navy", "ge-fleet"]) {
      const s = findService(svc)!;
      for (const [i, id] of ["pilot", "gunner", "marine"].entries())
        for (let k = 0; k < 6; k++) {
          const p = findPosition(id);
          const need = serviceNeed(s, p);
          const m = await rollCrewMember(p, 1, { ...DEFAULT_SETTINGS, setting: s.setting }, s.setting === "core" ? "human" : "ge-aslan", seedsFrom(1400 + i * 10 + k), 40, need);
          const first = m.t.careers.findIndex((c) => need.careers.includes(c.careerId));
          if (first >= 0) expect(m.t.careers.slice(first).every((c) => need.careers.includes(c.careerId)), `${svc} ${id} ${m.t.careers.map((c) => c.careerId).join(">")}`).toBe(true);
        }
    }
  }, 180000);
});
