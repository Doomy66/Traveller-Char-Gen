import { CAREERS } from "../rules/careers/index";
import { BOOK_NAMES, type Career, type Effect } from "../rules/types";
import { LIFE_EVENTS, PRE_CAREER_EVENTS } from "../rules/tables";
import { SPECIES } from "../rules/species";
import { clear, el, fmtCr } from "./dom";

/** A browser for the rules data: what the generator will read, career by career. */
export function renderRules(nav: HTMLElement, view: HTMLElement): void {
  clear(nav);
  const pages: { id: string; name: string; draw: () => void }[] = [
    ...CAREERS.map((c) => ({ id: c.id, name: c.name + (c.setting === "glorious-empire" ? " (GE)" : ""), draw: () => drawCareer(view, c) })),
    { id: "life", name: "Life events", draw: () => drawTable(view, "Life Events", "CRB p46", LIFE_EVENTS) },
    { id: "pre", name: "Pre-career events", draw: () => drawTable(view, "Pre-career Events", "CRB p17", PRE_CAREER_EVENTS) },
    { id: "species", name: "Species", draw: () => drawSpecies(view) },
  ];
  const buttons = pages.map((p) =>
    el("button", {
      type: "button",
      onclick: () => {
        buttons.forEach((b) => b.classList.remove("on"));
        btn(p.id).classList.add("on");
        p.draw();
      },
      "data-id": p.id,
      text: p.name,
    }),
  );
  const btn = (id: string) => buttons.find((b) => b.dataset.id === id)!;
  nav.append(el("h2", { class: "section" }, "The rules, as data"), el("p", { class: "muted" }, "Every career, table and event the generator rolls on. Text is summarised; the numbers are the book's. Page numbers are printed pages."), el("div", { class: "rules-nav" }, buttons));
  buttons[0]!.classList.add("on");
  pages[0]!.draw();
}

function effectsText(effects: Effect[]): string {
  return effects
    .map((e) => {
      switch (e.t) {
        case "gain":
          return e.what;
        case "check":
          return `${e.check}${e.pass ? `: pass ${effectsText(e.pass)}` : ""}${e.fail ? `; fail ${effectsText(e.fail)}` : ""}${e.on2 ? `; on 2 ${effectsText(e.on2)}` : ""}`;
        case "choose":
          return `choose: ${e.options.map((o) => o.label).join(" / ")}`;
        case "optional":
          return `optional: ${e.prompt}`;
        case "associate":
          return `${e.count ?? 1} ${e.kind}`;
        case "injury":
          return `injury${e.mode && e.mode !== "roll" ? ` (${e.mode})` : ""}`;
        case "benefitDM":
          return `DM${e.dm >= 0 ? "+" : ""}${e.dm} benefit`;
        case "advanceDM":
          return `DM${e.dm >= 0 ? "+" : ""}${e.dm} advancement`;
        case "nextTerm":
          return `next term ${e.career}`;
        case "special":
          return e.key;
        case "note":
          return "";
        default:
          return e.t;
      }
    })
    .filter(Boolean)
    .join(", ");
}

function drawTable(view: HTMLElement, title: string, src: string, rows: { roll: number; text: string; effects: Effect[] }[]): void {
  clear(view);
  view.append(
    el("div", { class: "rules-view" }, el("h3", {}, title), el("div", { class: "src" }, src)),
    el("table", { class: "t" }, el("tbody", {}, rows.map((r) => el("tr", {}, el("td", { class: "n" }, r.roll), el("td", {}, r.text, el("div", { class: "faint" }, effectsText(r.effects))))))),
  );
}

function drawSpecies(view: HTMLElement): void {
  clear(view);
  view.append(
    el(
      "div",
      { class: "rules-view" },
      SPECIES.map((s) => [
        el("h3", {}, s.name),
        el("div", { class: "src" }, `${BOOK_NAMES[s.source.book]} p${s.source.page}`),
        el("p", {}, s.description),
        el("p", { class: "muted" }, Object.entries(s.modifiers).map(([k, v]) => `${k} ${v! >= 0 ? "+" : ""}${v}`).join(", ") || "No modifiers"),
        s.traits.length ? el("ul", {}, s.traits.map((t) => el("li", {}, `${t.name}: ${t.text}`))) : null,
      ]),
    ),
  );
}

function drawCareer(view: HTMLElement, c: Career): void {
  clear(view);
  const q = c.qualification;
  const qual = q.check === null ? "Automatic" : `${q.check}${q.perPreviousCareer ? `, DM${q.perPreviousCareer} per previous career` : ""}${q.age ? `, DM${q.age.dm} aged ${q.age.age}+` : ""}${q.automaticIf ? `, automatic with ${q.automaticIf.stat} ${q.automaticIf.min}+` : ""}`;
  const skillTables = [...c.tables.map((t) => ({ name: t.name + (t.requires?.minEdu ? ` (EDU ${t.requires.minEdu}+)` : "") + (t.requires?.commissioned ? " (officers)" : "") + (t.requires?.gender ? ` (${t.requires.gender})` : ""), rows: t.rows })), ...c.assignments.map((a) => ({ name: a.name, rows: a.skills }))];
  view.append(
    el(
      "div",
      { class: "rules-view" },
      el("h3", {}, c.name),
      el("div", { class: "src" }, `${BOOK_NAMES[c.source.book]} p${c.source.page}`),
      el("p", {}, c.description),
      el("dl", { class: "kv" }, el("dt", {}, "Qualification"), el("dd", {}, qual), c.commission ? [el("dt", {}, "Commission"), el("dd", {}, c.commission)] : null, el("dt", {}, "Basic training"), el("dd", {}, c.basicTraining === "assignment" ? "Assignment table" : "Service Skills"), el("dt", {}, "Pension"), el("dd", {}, c.pension ? "After five terms" : "None"), el("dt", {}, "Medical bills"), el("dd", {}, c.medical)),
      c.notes?.length ? el("ul", {}, c.notes.map((n) => el("li", { class: "muted" }, n))) : null,
      el("h3", {}, "Assignments"),
      el("table", { class: "t" }, el("thead", {}, el("tr", {}, el("th", {}, "Assignment"), el("th", {}, "Survival"), el("th", {}, "Advancement"))), el("tbody", {}, c.assignments.map((a) => el("tr", {}, el("td", {}, a.name, el("div", { class: "faint" }, a.description + (a.gender ? ` (${a.gender} only)` : ""))), el("td", {}, a.survival), el("td", {}, a.advancement))))),
      el("h3", {}, "Skills and training"),
      el("table", { class: "t" }, el("thead", {}, el("tr", {}, el("th", {}, "1D"), skillTables.map((t) => el("th", {}, t.name)))), el("tbody", {}, [0, 1, 2, 3, 4, 5].map((i) => el("tr", {}, el("td", { class: "n" }, i + 1), skillTables.map((t) => el("td", {}, t.rows[i]!)))))),
      el("h3", {}, "Ranks"),
      c.ranks.map((rt) =>
        el(
          "table",
          { class: "t", style: "margin-bottom:8px" },
          el("thead", {}, el("tr", {}, el("th", {}, rt.officer ? "Officer rank" : "Rank"), el("th", {}, rt.assignments === "all" ? "All assignments" : rt.assignments.map((id) => c.assignments.find((a) => a.id === id)?.name ?? id).join(", ")), el("th", {}, "Bonus"))),
          el("tbody", {}, rt.ranks.map((r, i) => el("tr", {}, el("td", { class: "n" }, i), el("td", {}, r.title ?? "-"), el("td", {}, r.bonus ?? "-")))),
        ),
      ),
      el("h3", {}, "Mustering out"),
      el("table", { class: "t" }, el("thead", {}, el("tr", {}, el("th", {}, "1D"), el("th", {}, "Cash"), el("th", {}, "Other"))), el("tbody", {}, c.benefits.cash.map((cash, i) => el("tr", {}, el("td", { class: "n" }, i + 1), el("td", {}, cash ? fmtCr(cash) : "-"), el("td", {}, c.benefits.other[i] ?? ""))))),
      el("h3", {}, "Mishaps (1D)"),
      el("table", { class: "t" }, el("tbody", {}, c.mishaps.map((r) => el("tr", {}, el("td", { class: "n" }, r.roll), el("td", {}, r.text, el("div", { class: "faint" }, effectsText(r.effects))))))),
      el("h3", {}, "Events (2D)"),
      el("table", { class: "t" }, el("tbody", {}, c.events.map((r) => el("tr", {}, el("td", { class: "n" }, r.roll), el("td", {}, r.text, el("div", { class: "faint" }, effectsText(r.effects))))))),
    ),
  );
}
