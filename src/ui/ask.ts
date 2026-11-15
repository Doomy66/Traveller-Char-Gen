import { randomAnswerer, type Answerer, type Ask } from "../engine/context";
import { clear, el } from "./dom";

/**
 * The screen's side of the conversation: draws each question as a card of
 * buttons and resolves when one is pressed. In auto mode it answers itself
 * with the engine's suggestions, for "Finish for me" and NPCs.
 */
export class ScreenAnswerer implements Answerer {
  auto = false;
  private pending: { resolve: (v: number[]) => void; card: HTMLElement } | undefined;
  private readonly fallback: Answerer;

  constructor(
    private host: () => HTMLElement,
    random: () => number,
    private onAsk: () => void = () => {},
  ) {
    this.fallback = randomAnswerer(random);
  }

  /** Answer the question on screen with its suggestion, and every one after. */
  finishForMe(): void {
    this.auto = true;
    const p = this.pending;
    if (p) {
      this.pending = undefined;
      p.card.remove();
      // Let the engine's suggestion stand in for the click.
      p.resolve([-1]);
    }
  }

  async ask(a: Ask): Promise<number[]> {
    if (this.auto) return this.fallback.ask(a);
    const got = await new Promise<number[]>((resolve) => {
      const card = this.card(a, resolve);
      this.pending = { resolve, card };
      this.host().append(card);
      this.onAsk();
      card.scrollIntoView({ block: "nearest" });
      (card.querySelector("button.opt:not([disabled]), input") as HTMLElement | null)?.focus({ preventScroll: true });
    });
    if (got[0] === -1) return this.fallback.ask(a);
    return got;
  }

  async dice(count: number, label: string): Promise<number[]> {
    if (this.auto) return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
    return new Promise<number[]>((resolve) => {
      const inputs = Array.from({ length: count }, () => el("input", { type: "number", min: 1, max: 6, value: "" }));
      const go = () => {
        const v = inputs.map((i) => Number(i.value));
        if (v.some((x) => !(x >= 1 && x <= 6))) {
          inputs.find((i) => !(Number(i.value) >= 1 && Number(i.value) <= 6))?.focus();
          return;
        }
        card.remove();
        this.pending = undefined;
        resolve(v);
      };
      const card = el(
        "div",
        { class: "ask" },
        el("h3", {}, `Roll ${count}D: ${label}`),
        el("p", { class: "detail" }, "Type what your dice show."),
        el("div", { class: "foot" }, el("div", { class: "dice-in" }, inputs), el("button", { class: "primary", onclick: go }, "Done")),
      );
      inputs.forEach((i, n) =>
        i.addEventListener("keydown", (e) => {
          if (e.key === "Enter") n === inputs.length - 1 ? go() : inputs[n + 1]!.focus();
        }),
      );
      this.pending = { resolve: () => {}, card };
      this.host().append(card);
      this.onAsk();
      inputs[0]!.focus();
    });
  }

  /** Drop any question on screen (undo, restart). */
  cancel(): void {
    this.pending?.card.remove();
    this.pending = undefined;
  }

  private card(a: Ask, resolve: (v: number[]) => void): HTMLElement {
    const done = (v: number[]) => {
      card.remove();
      this.pending = undefined;
      resolve(v);
    };
    const hint = new Set(a.hint ?? []);
    let body: HTMLElement;
    let foot: HTMLElement | null = null;
    if (a.kind === "number") {
      const input = el("input", { type: "number", min: a.min ?? 0, max: a.max ?? 99, value: String(a.hint?.[0] ?? a.min ?? 0), style: "width:80px" });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") done([Number(input.value)]);
      });
      body = el("div", { class: "foot" }, input, el("button", { class: "primary", onclick: () => done([Number(input.value)]) }, "OK"));
    } else if (a.kind === "many") {
      const picked = new Set<number>();
      const count = a.count ?? 1;
      const okBtn = el("button", { class: "primary", disabled: true }, `Choose ${count}`);
      const btns = a.options.map((o, i) => {
        const b = el(
          "button",
          { class: "opt", type: "button", disabled: !!o.disabled, title: o.disabled ?? "" },
          el("span", {}, o.label),
          o.detail || o.disabled ? el("span", { class: "d" }, o.disabled ?? o.detail ?? "") : null,
        );
        b.addEventListener("click", () => {
          if (picked.has(i)) picked.delete(i);
          else if (picked.size < count) picked.add(i);
          b.classList.toggle("picked", picked.has(i));
          okBtn.disabled = picked.size !== count;
          okBtn.textContent = picked.size === count ? "OK" : `Choose ${count - picked.size} more`;
        });
        return b;
      });
      okBtn.addEventListener("click", () => done([...picked]));
      body = el("div", { class: `options${a.options.length > 6 ? " grid" : ""}` }, btns);
      foot = el("div", { class: "foot" }, okBtn);
    } else {
      body = el(
        "div",
        { class: `options${a.options.length > 8 && a.options.every((o) => !o.detail) ? " grid" : ""}` },
        a.options.map((o, i) =>
          el(
            "button",
            {
              class: `opt${hint.has(i) ? " hinted" : ""}`,
              type: "button",
              disabled: !!o.disabled,
              title: o.disabled ?? (hint.has(i) ? "Suggested" : ""),
              onclick: () => done([i]),
            },
            el("span", {}, o.label),
            o.detail || o.disabled ? el("span", { class: "d" }, o.disabled ? `${o.disabled}` : o.detail!) : null,
          ),
        ),
      );
    }
    const card = el("div", { class: "ask" }, el("h3", {}, a.prompt), a.detail ? el("p", { class: "detail" }, a.detail) : null, body, foot);
    return card;
  }
}

export function clearHost(h: HTMLElement): void {
  clear(h);
}
