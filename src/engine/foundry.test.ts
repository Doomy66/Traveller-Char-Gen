import { describe, expect, it } from "vitest";
import { fromFoundry, isFoundryActor } from "./foundry";

/** A Traveller actor laid out as Foundry's mgt2e system stores one (template.json). */
function actor(): Record<string, unknown> {
  const ch = (value: number, show = true) => ({ value, current: value, show });
  return {
    name: "Mira Halloran",
    type: "traveller",
    system: {
      characteristics: { STR: ch(7), DEX: ch(9), END: ch(8), INT: ch(10), EDU: ch(11), SOC: ch(6), PSI: ch(0, false) },
      skills: {
        admin: { id: "admin", value: 1, trained: true },
        advocate: { id: "advocate", value: 0, trained: false },
        carouse: { id: "carouse", value: 0, trained: true },
        jackofalltrades: { id: "jackofalltrades", value: 1, trained: true },
        vaccsuit: { id: "vaccsuit", value: 0, trained: true },
        electronics: {
          id: "electronics",
          value: 0,
          trained: true,
          specialities: { comms: { value: 0 }, computers: { value: 2 }, remoteOps: { value: 1 }, sensors: { value: 0 } },
        },
        engineer: { id: "engineer", value: 0, trained: true, specialities: { mDrive: { value: 1 }, jDrive: { value: 0 } } },
        animals: { id: "animals", value: 0, trained: true, specialities: { vetinary: { value: 1 } } },
        pilot: { id: "pilot", value: 0, trained: false, specialities: { spacecraft: { value: 3 } } },
        guncombat: { id: "guncombat", value: 0, trained: true, specialities: { slug: { value: 1 }, energy: { value: 0 } } },
        zeroG: { id: "zeroG", label: "Zero-G", value: 1, trained: true },
      },
      sophont: { age: 34, species: "Vilani", gender: "Female", homeworld: "Regina", profession: "" },
      finance: { cash: 12500, pension: 0, medicalDebt: 2000, mortgage: 0, description: "" },
      terms: 4,
      description: "<p>Ex-scout with a <b>grudge</b>.</p>",
    },
    items: [
      { name: "Term 1", type: "term", system: { term: { number: 1, termLength: 4, assignment: "Scout: Courier" }, description: "" } },
      { name: "Term 2", type: "term", system: { term: { number: 2, termLength: 4, assignment: "Scout: Courier (Senior Scout)" } } },
      { name: "Term 3", type: "term", system: { term: { number: 3, termLength: 4, assignment: "Merchant Marine: Merchant Marine" } } },
      { name: "Term 4", type: "term", system: { term: { number: 4, termLength: 4, assignment: "Belter" } } },
      { name: "Old Jas", type: "associate", system: { associate: { relationship: "ally" }, description: "Shipwright on Regina" } },
      { name: "Port Captain Vey", type: "associate", system: { associate: { relationship: "enemy" } } },
      { name: "Autopistol", type: "weapon", system: { tl: 6, cost: 200, quantity: 1, weapon: { damage: "3D-3", range: 10, skill: "guncombat.slug" } } },
      { name: "Mesh", type: "armour", system: { tl: 6, cost: 150, armour: { protection: 2 } } },
      { name: "Hand Computer", type: "item", system: { tl: 8, cost: 1000, quantity: 2 } },
      { name: "Broken toaster", type: "item", system: { status: "destroyed" } },
      { name: "Sensors", type: "hardware", system: {} },
    ],
  };
}

describe("Foundry VTT import", () => {
  it("knows a Foundry character from other JSON", () => {
    expect(isFoundryActor(actor())).toBe(true);
    expect(isFoundryActor([actor()])).toBe(true);
    expect(isFoundryActor({ actor: actor() })).toBe(true);
    expect(isFoundryActor({ ...actor(), type: "spacecraft" })).toBe(false);
    expect(isFoundryActor({ format: "traveller-char-gen" })).toBe(false);
    expect(() => fromFoundry({ name: "x" })).toThrow();
  });

  it("reads characteristics, who they are and money", () => {
    const { t } = fromFoundry(actor());
    expect(t.name).toBe("Mira Halloran");
    expect(t.stats).toEqual({ STR: 7, DEX: 9, END: 8, INT: 10, EDU: 11, SOC: 6 });
    expect(t.speciesId).toBe("human");
    expect(t.notes).toContain("Vilani");
    expect(t.notes).toContain("Ex-scout with a grudge.");
    expect(t.gender).toBe("female");
    expect(t.homeworld).toBe("Regina");
    expect(t.age).toBe(34);
    expect([t.cash, t.debt]).toEqual([12500, 2000]);
    expect(t.finished).toBe(true);
  });

  it("reads trained skills only, specialities by our names", () => {
    const { t, warnings } = fromFoundry(actor());
    expect(t.skills.Admin).toEqual({ level: 1, specs: {} });
    expect(t.skills.Carouse).toEqual({ level: 0, specs: {} });
    expect(t.skills["Jack-of-all-Trades"]).toEqual({ level: 1, specs: {} });
    expect(t.skills["Vacc Suit"]).toEqual({ level: 0, specs: {} });
    expect(t.skills.Electronics).toEqual({ level: 0, specs: { computers: 2, "remote ops": 1 } });
    expect(t.skills.Engineer).toEqual({ level: 0, specs: { "m-drive": 1 } });
    expect(t.skills.Animals).toEqual({ level: 0, specs: { veterinary: 1 } });
    expect(t.skills["Gun Combat"]).toEqual({ level: 0, specs: { slug: 1 } });
    expect(t.skills.Advocate).toBeUndefined();
    expect(t.skills.Pilot).toBeUndefined();
    expect(t.skills["Zero-G"]).toEqual({ level: 1, specs: {} });
    expect(warnings.some((w) => w.includes("Zero-G"))).toBe(true);
  });

  it("rebuilds careers from the term records", () => {
    const { t, warnings } = fromFoundry(actor());
    expect(t.careers.map((c) => [c.careerId, c.terms])).toEqual([
      ["scout", 2],
      ["merchant", 1],
      ["Belter", 1],
    ]);
    expect(t.careers[0]!.assignmentId).toBe("courier");
    expect(t.careers[0]!.rank).toBeGreaterThan(0);
    expect(t.careers[1]!.assignmentId).toBe("merchant-marine");
    expect(t.terms).toBe(4);
    expect(warnings.some((w) => w.includes("does not know"))).toBe(true);
  });

  it("brings associates and gear", () => {
    const { t } = fromFoundry(actor());
    expect(t.associates.map((a) => [a.kind, a.note])).toEqual([
      ["ally", "Old Jas: Shipwright on Regina"],
      ["enemy", "Port Captain Vey"],
    ]);
    expect(t.possessions.map((p) => p.name)).toEqual(["Autopistol", "Mesh", "Hand Computer ×2"]);
    expect(t.possessions[0]).toMatchObject({ skill: "Gun Combat (slug)", cost: 200 });
    expect(t.possessions[0]!.detail).toContain("3D-3");
    expect(t.possessions[1]!.detail).toContain("Protection +2");
  });

  it("reads Aslan and older Foundry files that use data, not system", () => {
    const a = actor();
    const sys = a.system as Record<string, unknown>;
    (sys.sophont as Record<string, unknown>).species = "Aslan";
    delete a.system;
    a.data = sys;
    const { t } = fromFoundry(a);
    expect(t.speciesId).toBe("aslan");
    expect(t.notes).not.toContain("Species in Foundry");
  });
});
