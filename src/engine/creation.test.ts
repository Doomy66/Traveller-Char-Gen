import { describe, expect, it } from "vitest";
import { emptyTraveller, type Traveller } from "./character";
import { Ctx, DEFAULT_SETTINGS, randomAnswerer, type Settings, type Step } from "./context";
import { createTraveller } from "./creation";
import { seededRandom } from "./dice";

/** Roll a whole Traveller with random answers. CharSpec 8. */
async function roll(seed: number, over: Partial<Settings> = {}, setup: Partial<Traveller> = {}, replay: Step[] = []) {
  const t = { ...emptyTraveller(), name: `T${seed}`, ...setup };
  const answerRandom = seededRandom(seed * 7 + 1);
  const ctx = new Ctx(t, { ...DEFAULT_SETTINGS, ...over }, randomAnswerer(answerRandom), seededRandom(seed), replay);
  await createTraveller(ctx);
  return ctx;
}

describe("creation", () => {
  it("rolls 300 human Travellers to the end without error", async () => {
    for (let seed = 1; seed <= 300; seed++) {
      const ctx = await roll(seed);
      const t = ctx.t;
      expect(t.finished, `seed ${seed}`).toBe(true);
      expect(t.age).toBe(18 + 4 * t.terms);
      for (const s of Object.values(t.skills)) {
        expect(s.level).toBeLessThanOrEqual(4);
        for (const v of Object.values(s.specs)) expect(v).toBeLessThanOrEqual(4);
      }
      for (const r of t.careers) expect(r.ended, `seed ${seed} ${r.careerId}`).toBe(true);
      expect(t.cashRolls).toBeLessThanOrEqual(3);
    }
  }, 120000);

  it("rolls Aslan, Vargr and every statistic method", async () => {
    for (let seed = 1; seed <= 60; seed++) {
      const species = ["aslan", "vargr"][seed % 2]!;
      const statMethod = (["assign", "order", "manual"] as const)[seed % 3]!;
      const ctx = await roll(seed, { statMethod, basicTrainingReplacesRoll: seed % 2 === 0 }, { speciesId: species, gender: seed % 2 ? "male" : "female" });
      expect(ctx.t.finished).toBe(true);
    }
  }, 60000);

  it("rolls Glorious Empire Aslan and human slaves", async () => {
    for (let seed = 1; seed <= 120; seed++) {
      const species = seed % 3 === 0 ? "ge-human-slave" : "ge-aslan";
      const ctx = await roll(seed, { setting: "glorious-empire" }, { speciesId: species, gender: seed % 2 ? "male" : "female" });
      expect(ctx.t.finished || ctx.t.dead).toBe(true);
    }
  }, 60000);

  it("replays a transcript to the same Traveller", async () => {
    const a = await roll(42);
    const b = await roll(42, {}, {}, a.transcript);
    expect(JSON.stringify(b.t)).toBe(JSON.stringify(a.t));
  });

  it("reaches every core career", async () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const ctx = await roll(seed);
      for (const r of ctx.t.careers) seen.add(r.careerId);
    }
    for (const id of ["agent", "army", "citizen", "drifter", "entertainer", "marine", "merchant", "navy", "rogue", "scholar", "scout"]) expect(seen, id).toContain(id);
  }, 120000);
});
