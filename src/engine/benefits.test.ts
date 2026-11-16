import { describe, expect, it } from "vitest";
import { emptyTraveller, setSkill, type Traveller } from "./character";
import { Ctx, DEFAULT_SETTINGS, randomAnswerer } from "./context";
import { itemSkillLevel, pickItem } from "./benefits";
import { seededRandom } from "./dice";
import { ITEMS } from "../rules/equipment";

/** CharSpec 7.3: weapon benefits suggest a weapon the Traveller has the skill for. */
async function pick(setup: (t: Traveller) => void, benefit: string, filter: Parameters<typeof pickItem>[2], seed: number) {
  const t: Traveller = { ...emptyTraveller(), name: `W${seed}`, stats: { STR: 7, DEX: 7, END: 7, INT: 7, EDU: 7, SOC: 7 } };
  setup(t);
  const ctx = new Ctx(t, DEFAULT_SETTINGS, randomAnswerer(seededRandom(seed)), seededRandom(seed + 1));
  await pickItem(ctx, benefit, filter);
  return { t, item: ITEMS.find((i) => i.name === t.possessions[0]!.name) };
}

describe("weapon benefits", () => {
  it("give an energy gunner an energy weapon and a swordsman a blade", async () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = await pick((t) => setSkill(t, "Gun Combat", "energy", 1), "Weapon", (i) => ["gun", "blade", "melee", "heavy", "grenade"].includes(i.category) && i.cost <= 1000 && i.tl <= 12, seed);
      expect(g.item?.skill, `seed ${seed}`).toBe("Gun Combat (energy)");
      const b = await pick((t) => setSkill(t, "Melee", "blade", 2), "Weapon", (i) => ["gun", "blade", "melee", "heavy", "grenade"].includes(i.category) && i.cost <= 1000 && i.tl <= 12, seed);
      expect(b.item?.skill, `seed ${seed}`).toBe("Melee (blade)");
    }
  });

  it("prefers the better skill and reads armour's Vacc Suit need", async () => {
    const { t, item } = await pick((tt) => (setSkill(tt, "Gun Combat", "slug", 2), setSkill(tt, "Gun Combat", "energy", 1)), "Gun", (i) => i.category === "gun" && i.cost <= 1000, 3);
    expect(item?.skill).toBe("Gun Combat (slug)");
    const suit = ITEMS.find((i) => i.id === "vacc-suit-tl8")!;
    expect(itemSkillLevel(t, suit)).toBe(-1);
    setSkill(t, "Vacc Suit", undefined, 1);
    expect(itemSkillLevel(t, suit)).toBe(1);
    expect(itemSkillLevel(t, ITEMS.find((i) => i.id === "jack")!)).toBeUndefined();
  });
});
