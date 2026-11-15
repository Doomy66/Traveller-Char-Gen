import { skillLevel, type Possession, type Traveller } from "../engine/character";
import { ITEMS, itemSkill, type Item, type ItemCategory } from "../rules/equipment";
import { STARTING_EQUIPMENT_LIMIT } from "../rules/tables";
import { clear, el, fmtCr } from "./dom";

/**
 * Starting equipment: up to Cr10,000 of personal gear out of the Traveller's
 * cash before play (CRB p46). Purchases are kept apart from the creation
 * transcript so undo does not lose them.
 */

const CATEGORIES: { id: ItemCategory | "all"; name: string }[] = [
  { id: "all", name: "Everything" },
  { id: "armour", name: "Armour" },
  { id: "gun", name: "Guns" },
  { id: "blade", name: "Blades" },
  { id: "melee", name: "Melee" },
  { id: "heavy", name: "Heavy weapons" },
  { id: "grenade", name: "Grenades and explosives" },
  { id: "survival", name: "Survival" },
  { id: "toolkit", name: "Toolkits" },
  { id: "science", name: "Scientific" },
  { id: "medical", name: "Medical" },
  { id: "drug", name: "Drugs" },
  { id: "comms", name: "Comms" },
  { id: "computer", name: "Computers and software" },
  { id: "sensor", name: "Sensors" },
  { id: "augment", name: "Augments" },
  { id: "vehicle", name: "Vehicles" },
  { id: "other", name: "Options and other" },
];

/** The item's skill as text and the Traveller's level in it, if the lists give it one. */
function skillFor(t: Traveller, i: Item): { text: string; level?: number; ok: boolean } | undefined {
  const s = itemSkill(i);
  if (!s) return undefined;
  const level = skillLevel(t, s.name, s.spec);
  const text = `${s.name}${s.spec ? ` (${s.spec})` : ""}${s.min ? ` ${s.min}` : ""}`;
  return { text, ...(level !== undefined ? { level } : {}), ok: level !== undefined && level >= s.min };
}

export function renderShop(host: HTMLElement, t: Traveller, purchases: Possession[], changed: () => void, maxTL = 12): void {
  let cat: ItemCategory | "all" = "gun";
  let query = "";
  let tl = maxTL;
  let onlySkilled = false;
  const spent = () => purchases.reduce((a, p) => a + (p.cost ?? 0), 0);
  const list = el("div", { class: "shop-list" });
  const status = el("p", { class: "muted" });

  const draw = () => {
    const allowance = Math.max(0, Math.min(STARTING_EQUIPMENT_LIMIT - spent(), t.cash));
    status.textContent = `Spent ${fmtCr(spent())} of the ${fmtCr(STARTING_EQUIPMENT_LIMIT)} starting allowance. Cash left ${fmtCr(t.cash)}.`;
    const items = ITEMS.filter((i) => (cat === "all" || i.category === cat) && i.tl <= tl && (!query || i.name.toLowerCase().includes(query)) && (!onlySkilled || skillFor(t, i)?.ok)).sort((a, b) => a.cost - b.cost);
    clear(list);
    if (!items.length) list.append(el("p", { class: "muted" }, onlySkilled ? "Nothing here that uses a skill you have." : "Nothing matches."));
    else list.append(
      el(
        "table",
        { class: "t" },
        el("thead", {}, el("tr", {}, el("th", {}, "Item"), el("th", {}, "Skill"), el("th", { class: "n" }, "TL"), el("th", { class: "n" }, "Cost"), el("th", {}, ""))),
        el(
          "tbody",
          {},
          items.map((i) =>
            el(
              "tr",
              {},
              el("td", {}, i.name, i.stats ? el("div", { class: "faint" }, i.stats) : null),
              (() => {
                const sk = skillFor(t, i);
                if (!sk) return el("td", { class: "faint" }, "-");
                return el("td", { class: sk.ok ? "good" : "faint", title: sk.ok ? `You have ${sk.text.replace(/ \d+$/, "")} ${sk.level}` : sk.level === undefined ? "Untrained" : `You have ${sk.level}` }, sk.text, el("div", { class: "faint" }, sk.level === undefined ? "untrained" : `you: ${sk.level}`));
              })(),
              el("td", { class: "n" }, i.tl),
              el("td", { class: "n" }, fmtCr(i.cost)),
              el(
                "td",
                {},
                el(
                  "button",
                  {
                    disabled: i.cost > allowance,
                    title: i.cost > allowance ? "Over what is left of the allowance" : "",
                    onclick: () => {
                      const p: Possession = { name: i.name, cost: i.cost, source: "Bought", ...(i.stats ? { detail: i.stats } : {}), ...(i.skill ? { skill: i.skill } : {}) };
                      purchases.push(p);
                      t.possessions.push(p);
                      t.cash -= i.cost;
                      changed();
                      draw();
                    },
                  },
                  "Buy",
                ),
              ),
            ),
          ),
        ),
      ),
    );
    clear(bought);
    if (purchases.length) {
      bought.append(
        el("h2", { class: "section" }, "Bought"),
        el(
          "table",
          { class: "t" },
          el(
            "tbody",
            {},
            purchases.map((p, n) =>
              el(
                "tr",
                {},
                el("td", {}, p.name),
                el("td", { class: "n" }, fmtCr(p.cost ?? 0)),
                el(
                  "td",
                  {},
                  el(
                    "button",
                    {
                      onclick: () => {
                        purchases.splice(n, 1);
                        const at = t.possessions.indexOf(p);
                        if (at >= 0) t.possessions.splice(at, 1);
                        t.cash += p.cost ?? 0;
                        changed();
                        draw();
                      },
                    },
                    "Return",
                  ),
                ),
              ),
            ),
          ),
        ),
      );
    }
  };
  const bought = el("div");
  clear(host);
  host.append(
    el("h2", { class: "section" }, "Starting equipment"),
    status,
    el(
      "div",
      { class: "shop-bar" },
      el(
        "select",
        { onchange: (e: Event) => ((cat = (e.target as HTMLSelectElement).value as ItemCategory), draw()) },
        CATEGORIES.map((c) => el("option", { value: c.id, selected: c.id === cat }, c.name)),
      ),
      el("input", { type: "search", placeholder: "Search", oninput: (e: Event) => ((query = (e.target as HTMLInputElement).value.toLowerCase()), draw()) }),
      el("label", { class: "check muted" }, el("input", { type: "checkbox", onchange: (e: Event) => ((onlySkilled = (e.target as HTMLInputElement).checked), draw()) }), " Only what I have the skill for"),
      el("label", { class: "muted" }, "Max TL ", el("input", { type: "number", min: 0, max: 20, value: String(tl), style: "width:56px", oninput: (e: Event) => ((tl = Number((e.target as HTMLInputElement).value) || 0), draw()) })),
    ),
    list,
    bought,
  );
  draw();
}
