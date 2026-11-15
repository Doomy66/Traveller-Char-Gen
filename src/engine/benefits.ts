import { findCareer } from "../rules/careers/index";
import { ITEMS, SHIPS, type Item, type ItemCategory } from "../rules/equipment";
import {
  BENEFIT_LIMITS,
  HIGH_RANK_BENEFIT_DM,
  MAX_CASH_ROLLS,
  pension,
  rankBenefitRolls,
  SHIP_MORTGAGE_STEP,
  SHIP_QUIRKS,
} from "../rules/tables";
import type { Career } from "../rules/types";
import { skillLevel, type CareerRecord } from "./character";
import type { Ctx } from "./context";
import { applyGain, changeStat, gainSkill, newTermState, type Env } from "./effects";
import { describeGain, parseBenefit, type Gain } from "./grammar";

/**
 * Mustering out: Benefit rolls, the Cash and Other Benefits columns, and what
 * each benefit gives (CRB pp46-48, GE p59). CharSpec 7.
 */

const fmt = (n: number) => `Cr${n.toLocaleString("en-GB")}`;

export function benefitRollCount(rec: CareerRecord): number {
  if (rec.noBenefits) return 0;
  return Math.max(0, rec.benefitRolls + rankBenefitRolls(rec.highestRank));
}

/** DM to every Benefit roll from this career. */
export function careerBenefitDM(ctx: Ctx, career: Career, rec: CareerRecord): number {
  const t = ctx.t;
  let d = rec.benefitDMAll;
  if (rec.highestRank >= 5) d += HIGH_RANK_BENEFIT_DM;
  for (const x of career.benefits.dms ?? []) {
    if (x.if === "SOC9" && (t.stats.SOC ?? 0) >= 9) d += x.dm;
    if (x.if === "male" && t.gender === "male") d += x.dm;
    if (x.if === "female" && t.gender === "female") d += x.dm;
    if (x.if === "mercenary" && rec.mercenary) d += x.dm;
    // Rank 5+ already earns DM+1 from Benefits of Rank; the Slave table restates it.
    if (x.if === "rank5" && rec.highestRank >= 5 && career.id !== "ge-slave") d += x.dm;
  }
  return d;
}

/** Leave a career: roll its benefits, then any pension (CRB p46-48). */
export async function musterOut(ctx: Ctx, rec: CareerRecord): Promise<void> {
  const t = ctx.t;
  if (rec.mustered) return;
  rec.mustered = true;
  rec.ended = true;
  const career = findCareer(rec.careerId);
  const env: Env = { career, rec, term: newTermState(), where: career.name };
  let rolls = benefitRollCount(rec) + t.looseBenefitRolls;
  t.looseBenefitRolls = 0;
  const dms = [...rec.benefitDMs, ...t.looseBenefitDMs];
  t.looseBenefitDMs = [];
  const allDM = careerBenefitDM(ctx, career, rec);
  ctx.log(
    `Mustering out of the ${career.name}: ${rolls} Benefit roll${rolls === 1 ? "" : "s"}${allDM ? `, DM${allDM >= 0 ? "+" : ""}${allDM} to each` : ""}.`,
    "career",
  );
  // GE p57: human Travellers take the Cash column only once outside the Slave career.
  const humanSlaveLimit = t.speciesId === "ge-human-slave" && career.id !== "ge-slave";
  let cashThisCareer = 0;
  let cashOnly = rec.cashOnlyRolls ?? 0;
  while (rolls > 0) {
    rolls--;
    const cashLeft = t.cashRolls < MAX_CASH_ROLLS && !(humanSlaveLimit && cashThisCareer >= 1);
    let column: "cash" | "other";
    if (cashOnly > 0 && cashLeft) {
      cashOnly--;
      column = "cash";
    } else {
      column = await ctx.one(
        `Benefit roll (${rolls + 1} left): which column?`,
        [
          {
            label: "Cash",
            value: "cash" as const,
            detail: career.benefits.cash.map((c, i) => `${i + 1}: ${c ? fmt(c) : "-"}`).join(" · "),
            ...(cashLeft ? {} : { disabled: humanSlaveLimit && cashThisCareer >= 1 ? "Cash only once for a human of the Empire" : `Cash already rolled ${MAX_CASH_ROLLS} times` }),
          },
          { label: "Other Benefits", value: "other" as const, detail: career.benefits.other.map((c, i) => `${i + 1}: ${c}`).join(" · ") },
        ],
        { hint: cashLeft && t.cashRolls < 2 && rolls % 2 === 0 ? 0 : 1, always: true },
      );
    }
    let dm = allDM;
    if (column === "cash" && (skillLevel(t, "Gambler") ?? 0) >= 1) dm += 1;
    if (dms.length > 0) {
      const pick = await ctx.one(
        "Use a Benefit DM on this roll?",
        [{ label: "No", value: -1 }, ...dms.map((d, i) => ({ label: `DM${d >= 0 ? "+" : ""}${d}`, value: i }))],
        { hint: 1, always: true },
      );
      if (pick >= 0) {
        dm += dms[pick]!;
        dms.splice(pick, 1);
      }
    }
    const r = (await ctx.roll("1D", "Benefit")).total;
    const table = column === "cash" ? career.benefits.cash : career.benefits.other;
    const row = Math.max(1, Math.min(table.length, r + dm));
    if (column === "cash") {
      t.cashRolls++;
      cashThisCareer++;
      const amount = career.benefits.cash[row - 1] ?? 0;
      t.cash += amount;
      ctx.log(`Cash: rolled ${r}${dm ? ` ${dm >= 0 ? "+" : ""}${dm}` : ""} = ${row}: ${fmt(amount)}.`, "benefit");
    } else {
      const text = career.benefits.other[row - 1]!;
      ctx.log(`Benefit: rolled ${r}${dm ? ` ${dm >= 0 ? "+" : ""}${dm}` : ""} = ${row}: ${text}.`, "benefit");
      const again = await applyBenefit(ctx, env, parseBenefit(text));
      if (again) rolls++;
    }
  }
  if (dms.length > 0) ctx.log("Unused Benefit DMs are lost.", "info");
  // Pension, CRB p48.
  if (career.pension && rec.terms >= 5) {
    const p = pension(rec.terms);
    t.pension += p;
    ctx.log(`Retired after ${rec.terms} terms: pension ${fmt(p)} a year.`, "benefit");
  }
  ctx.onChange();
}

/**
 * Apply one Other Benefit. Returns true when the benefit says to roll again
 * (a second Scout Ship).
 */
export async function applyBenefit(ctx: Ctx, env: Env, g: Gain): Promise<boolean> {
  const t = ctx.t;
  if (g.k === "choice") {
    const pick = await ctx.one("Choose a benefit", g.options.map((o) => ({ label: describeGain(o), value: o })), { always: true });
    return applyBenefit(ctx, env, pick);
  }
  if (g.k === "all") {
    let again = false;
    for (const x of g.items) again = (await applyBenefit(ctx, env, x)) || again;
    return again;
  }
  if (g.k !== "benefit") {
    if (g.k === "stat") await changeStat(ctx, g.stat, g.delta, g.atLeast);
    else await applyGain(ctx, env, g);
    return false;
  }
  const name = g.name;
  const n = (t.benefitCounts[name] = (t.benefitCounts[name] ?? 0) + 1);
  const repeat = n > 1;
  const L = BENEFIT_LIMITS;
  switch (name) {
    case "Contact":
    case "Aslan Contact":
      t.associates.push({ kind: "contact", note: name === "Aslan Contact" ? "An Aslan" : "", origin: `${env.where} benefit` });
      ctx.log("Gain a Contact.", "benefit");
      return false;
    case "Ally":
    case "External or Aslan Ally":
      t.associates.push({ kind: "ally", note: name === "Ally" ? "" : "From the Hierate, the Outrim Void, or an important Aslan", origin: `${env.where} benefit` });
      ctx.log("Gain an Ally.", "benefit");
      return false;
    case "TAS Membership":
      if (t.tasMember) {
        t.shipShares += 2;
        ctx.log("Already a TAS member: 2 Ship Shares instead.", "benefit");
      } else {
        t.tasMember = true;
        ctx.log("Membership of the Travellers' Aid Society.", "benefit");
      }
      return false;
    case "Blade":
      if (repeat && (await ctx.one("Blade again", [{ label: "Another blade", value: false }, { label: "Melee (blade) +1", value: true }], { always: true }))) {
        await gainSkill(ctx, env, "Melee", { spec: "blade" });
        return false;
      }
      await pickItem(ctx, "Blade", (i) => i.category === "blade" && i.cost <= L.blade.cost && i.tl <= L.blade.tl);
      return false;
    case "Gun":
    case "Weapon": {
      if (repeat && (await ctx.one(`${name} again`, [{ label: `Another ${name.toLowerCase()}`, value: false }, { label: "A level in the weapon's combat skill", value: true }], { always: true }))) {
        const skill = await weaponSkill(ctx);
        if (skill) await gainSkill(ctx, env, skill.name, skill.spec ? { spec: skill.spec } : {});
        return false;
      }
      const cats: ItemCategory[] = name === "Gun" ? ["gun"] : ["gun", "blade", "melee", "heavy", "grenade"];
      const lim = name === "Gun" ? L.gun : L.weapon;
      await pickItem(ctx, name, (i) => cats.includes(i.category) && i.cost <= lim.cost && i.tl <= lim.tl);
      return false;
    }
    case "Armour": {
      let limit = L.armour.cost;
      if (repeat) {
        const up = await ctx.one("Armour again", [{ label: "Another suit (up to Cr10,000)", value: false }, { label: "Trade up to armour worth up to Cr25,000", value: true }], { always: true });
        if (up) {
          limit = L.armour.upgrade;
          const old = t.possessions.findIndex((p) => p.source === "Benefit: Armour");
          if (old >= 0) t.possessions.splice(old, 1);
        }
      }
      await pickItem(ctx, "Armour", (i) => i.category === "armour" && i.cost <= limit && i.tl <= L.armour.tl);
      return false;
    }
    case "Cybernetic Implant":
    case "Combat Implant":
    case "Augmentation":
      await pickItem(ctx, name, (i) => i.category === "augment" && i.cost <= L.implant.cost && i.tl <= L.implant.tl);
      return false;
    case "Scientific Equipment":
      if (repeat) {
        const which = await ctx.one("Scientific Equipment again", [
          { label: "Another piece of equipment", value: "item" },
          { label: "Electronics +1", value: "Electronics" },
          { label: "Science +1", value: "Science" },
        ], { always: true });
        if (which !== "item") {
          await gainSkill(ctx, env, which);
          return false;
        }
      }
      await pickItem(ctx, name, (i) => (i.category === "science" || i.category === "sensor" || i.category === "toolkit") && i.cost <= L.science.cost && i.tl <= L.science.tl);
      return false;
    case "Personal Vehicle":
      if (repeat) {
        const which = await ctx.one("Personal Vehicle again", [{ label: "Drive +1", value: "Drive" }, { label: "Flyer +1", value: "Flyer" }], { always: true });
        await gainSkill(ctx, env, which);
        return false;
      }
      await pickItem(ctx, name, (i) => i.category === "vehicle" && !i.armed && i.cost <= L.vehicle.cost && i.tl <= L.vehicle.tl);
      return false;
    case "Free Trader":
      await shipBenefit(ctx, "free-trader", "far-trader", "trader");
      return false;
    case "Yacht":
      await shipBenefit(ctx, "yacht", "safari-ship", "other");
      return false;
    case "Lab Ship":
      await shipBenefit(ctx, "lab-ship", undefined, "other");
      return false;
    case "Scout Ship":
      if (t.ships.some((s) => s.shipId === "scout")) {
        ctx.log("A second Scout Ship: roll again.", "info");
        return true;
      }
      t.ships.push({ shipId: "scout", name: "Scout/Courier (Type S)", paidPercent: 100, quirks: [], note: "On detached duty: still belongs to the Scout Service and may be recalled." });
      ctx.log("A Scout/Courier, on loan from the Scout Service.", "benefit");
      return false;
    case "Ship's Boat":
      if (repeat) {
        const which = await ctx.one("Ship's Boat again", [{ label: "Pilot (small craft) +1", value: "pilot" }, { label: "A Ship Share", value: "share" }], { always: true });
        if (which === "pilot") await gainSkill(ctx, env, "Pilot", { spec: "small craft" });
        else {
          t.shipShares++;
          ctx.log("1 Ship Share.", "benefit");
        }
        return false;
      }
      {
        const craft = SHIPS.filter((s) => s.type === "small craft" && s.costMCr <= L.smallCraft.costMCr);
        const id = await ctx.one("Which small craft?", craft.map((s) => ({ label: s.name, value: s.id, detail: `${s.tons} tons, MCr${s.costMCr}` })), {
          hint: craft.findIndex((s) => s.id === "ships-boat"),
        });
        const s = SHIPS.find((x) => x.id === id)!;
        t.ships.push({ shipId: s.id, name: s.name, paidPercent: 100, quirks: [] });
        ctx.log(`A ${s.name}, owned outright.`, "benefit");
      }
      return false;
    // Glorious Empire, GE p59.
    case "Brotherhood of the Empire": {
      const n = (await ctx.roll("D3", "Allies")).total;
      for (let i = 0; i < n; i++) t.associates.push({ kind: "ally", note: "Officer corps", origin: `${env.where} benefit` });
      t.possessions.push({ name: "Brotherhood of the Empire", detail: "Free travel in the Empire; a Middle Passage a month", source: "Benefit" });
      ctx.log(`Brotherhood of the Empire: ${n} Allies among the officer corps.`, "benefit");
      return false;
    }
    case "Courier": {
      const quirks: string[] = [];
      for (let i = 0; i < 3; i++) quirks.push(await rollQuirk(ctx, "military"));
      t.ships.push({ shipId: "wahtoi-courier", name: "Wahtoi courier", paidPercent: 100, quirks, note: "Held by your ahriy; you carry the Empire's mail." });
      ctx.log("Custodian of a Wahtoi courier.", "benefit");
      return false;
    }
    case "Transport":
      t.ships.push({ shipId: "ge-transport", name: "Military transport", paidPercent: 100, quirks: [], note: "An armed trader or Aoheileikh mercenary cruiser at the referee's choice; the Empire may call on it." });
      ctx.log("Your ahriy gains access to a military transport.", "benefit");
      return false;
    case "Freedom":
      t.slave = false;
      t.stats.SOC = Math.max(t.stats.SOC ?? 0, 2);
      t.leftEmpire = "core";
      t.restrictTo = undefined;
      env.term.leave = true;
      ctx.log("Freedom: you become an awkhea, a landless serf, with SOC 2. Core careers are open to you.", "benefit");
      return false;
    case "Secret School":
      t.possessions.push({ name: "Secret School", detail: "Membership of a secret warrior school (details at the referee's discretion)", source: "Benefit" });
      ctx.log("Admitted to a secret school.", "benefit");
      return false;
    default:
      ctx.log(`Benefit "${name}" noted.`, "benefit");
      t.possessions.push({ name, source: "Benefit" });
      return false;
  }
}

async function weaponSkill(ctx: Ctx): Promise<{ name: string; spec?: string } | undefined> {
  const t = ctx.t;
  const weapons = t.possessions.filter((p) => p.skill);
  if (weapons.length === 0) return { name: "Gun Combat" };
  const w = await ctx.one("Which weapon's skill?", weapons.map((p) => ({ label: `${p.name} (${p.skill})`, value: p })));
  const m = /^(.+?)(?: \((.+)\))?$/.exec(w.skill!)!;
  return m[2] ? { name: m[1]!, spec: m[2] } : { name: m[1]! };
}

/** Choose an item from the equipment lists within a benefit's limits, or leave it for later. */
export async function pickItem(ctx: Ctx, benefit: string, filter: (i: Item) => boolean): Promise<void> {
  const items = ITEMS.filter(filter).sort((a, b) => b.cost - a.cost);
  const options = [
    ...items.map((i) => ({ label: `${i.name} (TL${i.tl}, ${fmt(i.cost)})`, value: i as Item | null, ...(i.stats ? { detail: i.stats } : {}) })),
    { label: "Choose later (note it on the sheet)", value: null as Item | null },
  ];
  const pick = await ctx.one(`${benefit}: choose one`, options, { always: true });
  if (pick) {
    ctx.t.possessions.push({
      name: pick.name,
      ...(pick.stats ? { detail: pick.stats } : {}),
      cost: pick.cost,
      ...(pick.skill ? { skill: pick.skill } : {}),
      source: `Benefit: ${benefit}`,
    });
    ctx.log(`${benefit}: ${pick.name}.`, "benefit");
  } else {
    ctx.t.possessions.push({ name: `${benefit} (to choose)`, source: `Benefit: ${benefit}` });
    ctx.log(`${benefit}: to be chosen later.`, "benefit");
  }
}

async function rollQuirk(ctx: Ctx, column: "trader" | "military" | "other"): Promise<string> {
  const r = (await ctx.roll("2D", "Spacecraft quirk")).total;
  return SHIP_QUIRKS.find((q) => q.roll === r)![column];
}

/** Free Trader, Yacht, Lab Ship: 25% of the mortgage paid per roll, quirks on the first (CRB p47). */
async function shipBenefit(ctx: Ctx, id: string, alt: string | undefined, column: "trader" | "military" | "other"): Promise<void> {
  const t = ctx.t;
  const existing = t.ships.find((s) => s.shipId === id || (alt !== undefined && s.shipId === alt));
  if (existing) {
    existing.paidPercent = Math.min(100, existing.paidPercent + SHIP_MORTGAGE_STEP);
    ctx.log(`${existing.name}: ${existing.paidPercent}% of the mortgage now paid off.`, "benefit");
    return;
  }
  let chosen = id;
  if (alt) {
    const a = SHIPS.find((s) => s.id === id)!;
    const b = SHIPS.find((s) => s.id === alt)!;
    chosen = await ctx.one("Which ship?", [
      { label: a.name, value: a.id, detail: `${a.tons} tons, MCr${a.costMCr}` },
      { label: b.name, value: b.id, detail: `${b.tons} tons, MCr${b.costMCr}` },
    ], { hint: 0, always: true });
  }
  const s = SHIPS.find((x) => x.id === chosen)!;
  const n = (await ctx.roll("1D", "Number of quirks")).total;
  const quirks: string[] = [];
  for (let i = 0; i < n; i++) quirks.push(await rollQuirk(ctx, column));
  t.ships.push({ shipId: s.id, name: s.name, paidPercent: SHIP_MORTGAGE_STEP, quirks });
  ctx.log(`A ${s.name} with 25% of the mortgage paid, and ${n} quirk${n === 1 ? "" : "s"}.`, "benefit");
}
