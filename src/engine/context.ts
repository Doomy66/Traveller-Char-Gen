import { diceCount, diceTotal, type DiceSpec } from "./dice";
import type { HistoryEntry, Traveller } from "./character";

/**
 * The conversation between the engine and whoever is making the decisions.
 *
 * The engine is one async function that walks through creation and stops at
 * every decision and every die. Whatever answers (the screen, a random NPC
 * maker, a test) implements `Answerer`. Every answer and every die goes into
 * a transcript, so a Traveller can be rebuilt exactly by replaying it, and
 * undo is "replay all but the last decision". CharSpec 5.
 */

export interface Settings {
  /** Which careers and species are on offer. */
  setting: "core" | "glorious-empire";
  /** CRB p9: assign the six rolls freely, or in order; or type them in. */
  statMethod: "assign" | "order" | "manual";
  /** CRB p228: PSI may only be tested with the referee's permission. */
  psionics: boolean;
  /**
   * CRB p18 says basic training comes "instead of rolling for a skill". On, the
   * first term of a career has basic training and no skill roll; off, both.
   */
  basicTrainingReplacesRoll: boolean;
  /** Roll physical dice and type them in. */
  manualDice: boolean;
  /** Players in the group, for sharing out the skill package. */
  groupSize: number;
}

export const DEFAULT_SETTINGS: Settings = {
  setting: "core",
  statMethod: "assign",
  psionics: true,
  basicTrainingReplacesRoll: true,
  manualDice: false,
  groupSize: 4,
};

export interface AskOption {
  label: string;
  detail?: string;
  /** Why it cannot be picked, if it cannot. */
  disabled?: string;
}

export interface Ask {
  /** Pick one, pick several, or type a number. */
  kind: "one" | "many" | "number";
  prompt: string;
  detail?: string;
  options: AskOption[];
  /** many: how many to pick (exactly, unless fewer are available). */
  count?: number;
  /** number: range. */
  min?: number;
  max?: number;
  /** The engine's suggestion, which an automatic answerer takes. */
  hint?: number[];
}

export interface Answerer {
  ask(a: Ask): Promise<number[]>;
  /** Manual dice: the player rolls `count` d6 for `label`. */
  dice?(count: number, label: string): Promise<number[]>;
}

export type Step = { c: number[] } | { r: number[] };

export class Abort extends Error {
  constructor() {
    super("aborted");
  }
}

export interface Option<T> {
  label: string;
  value: T;
  detail?: string;
  disabled?: string;
}

export class Ctx {
  readonly transcript: Step[] = [];
  private pos = 0;
  aborted = false;
  /** Called whenever the Traveller may have changed, so the sheet can redraw. */
  onChange: () => void = () => {};

  constructor(
    public t: Traveller,
    public settings: Settings,
    private answerer: Answerer,
    private random: () => number,
    private replay: Step[] = [],
  ) {}

  get replaying(): boolean {
    return this.pos < this.replay.length;
  }

  private next(kind: "c" | "r"): Step | undefined {
    if (this.pos >= this.replay.length) return undefined;
    const s = this.replay[this.pos]!;
    if ((kind === "c") !== ("c" in s)) {
      // The replay no longer matches the path (data changed); stop replaying.
      this.replay = this.replay.slice(0, this.pos);
      return undefined;
    }
    this.pos++;
    return s;
  }

  private async answer(a: Ask): Promise<number[]> {
    if (this.aborted) throw new Abort();
    const r = this.next("c") as { c: number[] } | undefined;
    if (r) {
      this.transcript.push(r);
      return r.c;
    }
    this.onChange();
    const got = await this.answerer.ask(a);
    if (this.aborted) throw new Abort();
    this.transcript.push({ c: got });
    return got;
  }

  /** Pick one. A single enabled option is taken without asking unless `always`. */
  async one<T>(prompt: string, options: Option<T>[], o: { detail?: string; hint?: number; always?: boolean } = {}): Promise<T> {
    const enabled = options.map((x, i) => (x.disabled ? -1 : i)).filter((i) => i >= 0);
    if (enabled.length === 0) throw new Error(`No option available for "${prompt}"`);
    if (enabled.length === 1 && !o.always) return options[enabled[0]!]!.value;
    const hint = o.hint !== undefined && enabled.includes(o.hint) ? o.hint : undefined;
    const got = await this.answer({
      kind: "one",
      prompt,
      ...(o.detail !== undefined ? { detail: o.detail } : {}),
      options: options.map(({ label, detail, disabled }) => ({ label, ...(detail ? { detail } : {}), ...(disabled ? { disabled } : {}) })),
      ...(hint !== undefined ? { hint: [hint] } : {}),
    });
    const i = got[0]!;
    const picked = options[i];
    if (!picked || picked.disabled) throw new Error(`Bad answer ${i} to "${prompt}"`);
    return picked.value;
  }

  /** Pick `count` distinct options (fewer if fewer are enabled). */
  async many<T>(prompt: string, options: Option<T>[], count: number, o: { detail?: string; hint?: number[] } = {}): Promise<T[]> {
    const enabled = options.map((x, i) => (x.disabled ? -1 : i)).filter((i) => i >= 0);
    const n = Math.min(count, enabled.length);
    if (n <= 0) return [];
    if (n === enabled.length) return enabled.map((i) => options[i]!.value);
    const got = await this.answer({
      kind: "many",
      prompt,
      ...(o.detail !== undefined ? { detail: o.detail } : {}),
      options: options.map(({ label, detail, disabled }) => ({ label, ...(detail ? { detail } : {}), ...(disabled ? { disabled } : {}) })),
      count: n,
      ...(o.hint ? { hint: o.hint } : {}),
    });
    return got.map((i) => options[i]!.value);
  }

  async number(prompt: string, min: number, max: number, o: { detail?: string; hint?: number } = {}): Promise<number> {
    const got = await this.answer({
      kind: "number",
      prompt,
      ...(o.detail !== undefined ? { detail: o.detail } : {}),
      options: [],
      min,
      max,
      ...(o.hint !== undefined ? { hint: [o.hint] } : {}),
    });
    return Math.max(min, Math.min(max, Math.round(got[0] ?? min)));
  }

  async yes(prompt: string, o: { detail?: string; hint?: boolean } = {}): Promise<boolean> {
    return this.one(
      prompt,
      [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
      { ...(o.detail !== undefined ? { detail: o.detail } : {}), always: true, ...(o.hint !== undefined ? { hint: o.hint ? 0 : 1 } : {}) },
    );
  }

  /** Roll dice. Returns the individual dice and the total. */
  async roll(spec: DiceSpec, label: string): Promise<{ dice: number[]; total: number }> {
    if (this.aborted) throw new Abort();
    const n = diceCount(spec);
    const r = this.next("r") as { r: number[] } | undefined;
    let dice: number[];
    if (r) dice = r.r;
    else if (this.settings.manualDice && this.answerer.dice) {
      this.onChange();
      dice = await this.answerer.dice(n, `${label} (${spec})`);
      if (this.aborted) throw new Abort();
    } else dice = Array.from({ length: n }, () => 1 + Math.floor(this.random() * 6));
    this.transcript.push({ r: dice });
    return { dice, total: diceTotal(spec, dice) };
  }

  log(text: string, kind?: HistoryEntry["kind"]): void {
    this.t.history.push({ term: this.t.terms, age: this.t.age, text, ...(kind ? { kind } : {}) });
  }
}

/** An answerer that takes the engine's hint, else a random enabled option. For NPCs and tests. */
export function randomAnswerer(random: () => number): Answerer {
  return {
    async ask(a: Ask): Promise<number[]> {
      if (a.kind === "number") return [a.hint?.[0] ?? a.min ?? 0];
      const enabled = a.options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
      if (a.kind === "one") {
        if (a.hint && a.hint.length > 0) return [a.hint[0]!];
        return [enabled[Math.floor(random() * enabled.length)]!];
      }
      const n = a.count ?? 1;
      const picks = new Set<number>(a.hint?.filter((h) => enabled.includes(h)).slice(0, n) ?? []);
      const pool = enabled.filter((i) => !picks.has(i));
      while (picks.size < n && pool.length > 0) picks.add(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
      return [...picks];
    },
  };
}
