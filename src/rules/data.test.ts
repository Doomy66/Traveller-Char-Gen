import { describe, expect, it } from "vitest";
import { parseBenefit, parseCheck, parseGain } from "../engine/grammar";
import { SPECIALS } from "../engine/effects";
import { CAREERS } from "./careers/index";
import { GE_ALT_TABLES } from "./careers/ge";
import { ITEMS, SHIPS } from "./equipment";
import { findSkill } from "./skills";
import { LIFE_EVENTS, PRE_CAREER_EVENTS, SKILL_PACKAGES } from "./tables";
import type { Effect, TableRow } from "./types";

/** Every string in every table parses, and every table has the shape the book gives it. CharSpec 3. */

function walk(effects: Effect[], visit: (e: Effect) => void): void {
  for (const e of effects) {
    visit(e);
    switch (e.t) {
      case "choose":
        e.options.forEach((o) => walk(o.effects, visit));
        break;
      case "optional":
        walk(e.yes, visit);
        walk(e.no ?? [], visit);
        break;
      case "check":
        [e.pass, e.fail, e.on2, e.high].forEach((x) => walk(x ?? [], visit));
        break;
      case "roll":
        e.results.forEach((r) => walk(r.effects, visit));
        break;
      case "convert":
        walk(e.otherwise ?? [], visit);
        break;
      case "special": {
        const cases = (e.args?.cases ?? {}) as Record<string, Effect[]>;
        Object.values(cases).forEach((c) => walk(c, visit));
        walk((e.args?.otherwise as Effect[] | undefined) ?? [], visit);
        break;
      }
      default:
        break;
    }
  }
}

function checkRows(rows: TableRow[]): void {
  for (const row of rows) {
    walk(row.effects, (e) => {
      if (e.t === "gain") expect(() => parseGain(e.what), `${row.roll}: ${e.what}`).not.toThrow();
      if (e.t === "check") expect(() => parseCheck(e.check), `${row.roll}: ${e.check}`).not.toThrow();
      if (e.t === "draftOrDrifter" && e.canAvoid) expect(() => parseCheck(e.canAvoid!)).not.toThrow();
      if (e.t === "special") expect(SPECIALS[e.key], `special ${e.key}`).toBeDefined();
    });
  }
}

describe("careers", () => {
  for (const c of CAREERS) {
    describe(c.name, () => {
      it("has parsable checks", () => {
        if (c.qualification.check) expect(() => parseCheck(c.qualification.check!)).not.toThrow();
        if (c.commission) expect(() => parseCheck(c.commission!)).not.toThrow();
        for (const a of c.assignments) {
          expect(() => parseCheck(a.survival), `${a.name} survival`).not.toThrow();
          expect(() => parseCheck(a.advancement), `${a.name} advancement`).not.toThrow();
          if (a.qualification) expect(() => parseCheck(a.qualification!)).not.toThrow();
        }
      });
      it("has parsable skill tables", () => {
        for (const tb of c.tables) {
          expect(tb.rows).toHaveLength(6);
          for (const r of tb.rows) expect(() => parseGain(r), `${tb.name}: ${r}`).not.toThrow();
        }
        for (const a of c.assignments) {
          expect(a.skills).toHaveLength(6);
          for (const r of a.skills) expect(() => parseGain(r), `${a.name}: ${r}`).not.toThrow();
        }
      });
      it("has seven ranks per table with parsable bonuses", () => {
        expect(c.ranks.length).toBeGreaterThan(0);
        for (const rt of c.ranks) {
          expect(rt.ranks.length).toBeGreaterThanOrEqual(7);
          for (const r of rt.ranks) if (r.bonus) expect(() => parseGain(r.bonus!), r.bonus).not.toThrow();
          if (rt.assignments !== "all") for (const id of rt.assignments) expect(c.assignments.map((a) => a.id)).toContain(id);
        }
        for (const a of c.assignments) expect(c.ranks.some((r) => r.assignments === "all" || r.assignments.includes(a.id)), a.id).toBe(true);
      });
      it("has parsable benefits", () => {
        expect(c.benefits.cash.length).toBeGreaterThanOrEqual(7);
        expect(c.benefits.other.length).toBe(c.benefits.cash.length);
        for (const b of c.benefits.other) expect(() => parseBenefit(b), b).not.toThrow();
      });
      it("has full event and mishap tables", () => {
        expect(c.events.map((e) => e.roll)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        expect(c.mishaps.map((e) => e.roll)).toEqual([1, 2, 3, 4, 5, 6]);
        checkRows(c.events);
        checkRows(c.mishaps);
      });
    });
  }
  it("has the dog soldier tables", () => {
    for (const t of Object.values(GE_ALT_TABLES)) {
      expect(t.events.map((e) => e.roll)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(t.mishaps.map((e) => e.roll)).toEqual([1, 2, 3, 4, 5, 6]);
      checkRows(t.events);
      checkRows(t.mishaps);
    }
  });
  it("has unique ids", () => {
    expect(new Set(CAREERS.map((c) => c.id)).size).toBe(CAREERS.length);
  });
});

describe("general tables", () => {
  it("parse", () => {
    checkRows(LIFE_EVENTS);
    checkRows(PRE_CAREER_EVENTS);
    for (const p of SKILL_PACKAGES) for (const s of p.skills) expect(() => parseGain(s)).not.toThrow();
  });
});

describe("equipment", () => {
  it("has unique ids and sane numbers", () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const i of ITEMS) {
      expect(i.cost).toBeGreaterThanOrEqual(0);
      expect(i.tl).toBeGreaterThanOrEqual(0);
    }
    expect(SHIPS.length).toBeGreaterThan(10);
  });
});

describe("grammar", () => {
  it("reads the forms the books use", () => {
    expect(parseGain("Streetwise 1")).toEqual({ k: "skill", name: "Streetwise", level: 1 });
    expect(parseGain("Gun Combat (slug)")).toEqual({ k: "skill", name: "Gun Combat", spec: "slug" });
    expect(parseGain("DEX +1")).toEqual({ k: "stat", stat: "DEX", delta: 1 });
    expect(parseGain("SOC 10 or SOC +1").k).toBe("choice");
    expect(parseGain("Deception, Persuade and Stealth").k).toBe("all");
    expect(parseGain("Melee (natural or blade)")).toEqual({ k: "skill", name: "Melee", specChoices: ["natural", "blade"] });
    expect(parseBenefit("External or Aslan Ally")).toEqual({ k: "benefit", name: "External or Aslan Ally" });
    expect(parseBenefit("SOC +1 or Cybernetic Implant").k).toBe("choice");
    expect(parseBenefit("2D Ship Shares")).toEqual({ k: "shares", kind: "ship", n: 0, dice: "2D" });
    expect(parseCheck("DEX or INT 5+")).toEqual([
      { kind: "stat", stat: "DEX", target: 5 },
      { kind: "stat", stat: "INT", target: 5 },
    ]);
    expect(parseCheck("Melee 8+, Gun Combat 8+ or Stealth 8+")).toHaveLength(3);
    expect(parseGain("Independence [male] or Admin [female,slave]")).toEqual({
      k: "choice",
      options: [
        { k: "skill", name: "Independence", tags: ["male"] },
        { k: "skill", name: "Admin", tags: ["female", "slave"] },
      ],
    });
  });
});

describe("item skills", () => {
  it("reads weapon skills and armour requirements", async () => {
    const { itemSkill } = await import("./equipment");
    const by = (id: string) => itemSkill(ITEMS.find((i) => i.id === id)!);
    expect(by("battle-dress-tl13")).toEqual({ name: "Vacc Suit", min: 2 });
    expect(by("vacc-suit-tl10")).toEqual({ name: "Vacc Suit", min: 0 });
    expect(by("jack")).toBeUndefined();
    const gun = ITEMS.find((i) => i.skill === "Gun Combat (slug)")!;
    expect(itemSkill(gun)).toEqual({ name: "Gun Combat", spec: "slug", min: 0 });
    for (const i of ITEMS) {
      const s = itemSkill(i);
      if (s) expect(findSkill(s.name), `${i.id} ${s.name}`).toBeDefined();
    }
  });
});
