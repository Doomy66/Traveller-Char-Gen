import { skillCap, skillList, totalSkillLevels, upp, type Traveller } from "../engine/character";
import { rankTitle } from "../engine/effects";
import { careerLine, nobleTitle } from "../engine/export";
import { findCareer, hasCareer } from "../rules/careers/index";
import { findSpecies } from "../rules/species";
import { characteristicDM, STAT_NAMES } from "../rules/tables";
import type { Stat } from "../rules/types";
import { clear, el, fmtCr } from "./dom";

/**
 * The character sheet, redrawn whenever the Traveller changes. `editable`
 * lets the name, goal and notes be typed into once creation is done.
 */
export function renderSheet(host: HTMLElement, t: Traveller, o: { editable?: boolean; onEdit?: () => void } = {}): void {
  clear(host);
  const sp = findSpecies(t.speciesId);
  const title = nobleTitle(t);
  const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  const nameEl = o.editable
    ? el("input", {
        class: "inline",
        value: t.name,
        placeholder: "Name",
        style: "font-size:22px;font-weight:600;width:100%",
        oninput: (e: Event) => {
          t.name = (e.target as HTMLInputElement).value;
          o.onEdit?.();
        },
      })
    : el("h1", {}, `${title ? `${title} ` : ""}${t.name || "Unnamed Traveller"}`);

  const stats: Stat[] = ["STR", "DEX", "END", "INT", "EDU", "SOC", "PSI", "TER"];
  const statBoxes = stats
    .filter((s) => t.stats[s] !== undefined)
    .map((s) => {
      const v = t.stats[s]!;
      const lost = t.injuryLoss[s] ?? 0;
      return el(
        "div",
        { class: `stat${lost ? " lost" : ""}`, title: `${STAT_NAMES[s]}${lost ? `; ${lost} lost to injury` : ""}` },
        el("div", { class: "k" }, s),
        el("div", { class: "v" }, v),
        el("div", { class: "m" }, `DM${sign(characteristicDM(v))}`),
      );
    });
  if (t.rite !== undefined) statBoxes.push(el("div", { class: "stat", title: "Rite of passage" }, el("div", { class: "k" }, "RITE"), el("div", { class: "v" }, t.rite), el("div", { class: "m" }, `DM${sign(characteristicDM(t.rite))}`)));

  const skills = skillList(t);
  const careerRows = t.careers.map((r) => {
    const c = hasCareer(r.careerId) ? findCareer(r.careerId) : undefined;
    return el(
      "tr",
      {},
      el("td", {}, careerLine(r).replace(/, \d+ terms?, rank .*$/, "")),
      el("td", { class: "n" }, r.terms),
      el("td", {}, `${r.officer ? "O" : ""}${r.rank}${c && rankTitle(c, r) ? ` ${rankTitle(c, r)}` : ""}`),
      el("td", { class: "muted" }, r.ended ? (r.endReason ?? "left") : "serving"),
    );
  });

  const money: [string, string][] = [["Cash", fmtCr(t.cash)]];
  if (t.debt) money.push(["Debt", fmtCr(t.debt)]);
  if (t.pension) money.push(["Pension", `${fmtCr(t.pension)} a year`]);
  if (t.shipShares) money.push(["Ship Shares", String(t.shipShares)]);
  if (t.clanShares) money.push(["Clan Shares", String(t.clanShares)]);
  if (t.tasMember) money.push(["TAS", "Member of the Travellers' Aid Society"]);
  if (t.skillPackage) money.push(["Skills package", t.skillPackage]);
  if (t.anagathics.everUsed) money.push(["Anagathics", `${t.anagathics.terms} term${t.anagathics.terms === 1 ? "" : "s"}${t.anagathics.active ? ", still taking them" : ""}`]);
  if (t.ageingCrisis) money.push(["Ageing crisis", "Survived one; qualification rolls fail"]);

  const assocKinds = ["ally", "contact", "rival", "enemy"] as const;

  host.append(
    el(
      "div",
      { class: "sheet" },
      nameEl,
      el("div", { class: "sub" }, `${sp.name}${t.gender !== "other" ? `, ${t.gender}` : ""}, age ${t.age}${t.homeworld ? `, from ${t.homeworld}` : ""}${t.slave ? ", slave" : ""}`, " ", el("span", { class: "upp" }, upp(t))),
      el("div", { class: "stats" }, statBoxes),

      el("h2", { class: "section" }, `Skills `, el("span", { class: "faint" }, `(${totalSkillLevels(t)} of ${skillCap(t)} levels)`)),
      skills.length ? el("ul", { class: "skills" }, skills.map((s) => el("li", {}, el("span", {}, s.name), el("span", { class: "lv" }, s.level)))) : el("p", { class: "muted" }, "None yet."),

      t.careers.length
        ? [
            el("h2", { class: "section" }, "Careers"),
            el("table", { class: "t" }, el("thead", {}, el("tr", {}, el("th", {}, "Career"), el("th", { class: "n" }, "Terms"), el("th", {}, "Rank"), el("th", {}, ""))), el("tbody", {}, careerRows)),
          ]
        : null,

      el("h2", { class: "section" }, "Finances"),
      el("dl", { class: "kv" }, money.flatMap(([k, v]) => [el("dt", {}, k), el("dd", {}, v)])),

      t.ships.length
        ? [
            el("h2", { class: "section" }, "Ships"),
            t.ships.map((s) =>
              el(
                "div",
                { style: "margin-bottom:6px" },
                el("strong", {}, s.name),
                ` ${s.paidPercent >= 100 ? (s.note ? "" : "owned outright") : `${s.paidPercent}% of the mortgage paid`}`,
                s.note ? el("div", { class: "muted" }, s.note) : null,
                s.quirks.length ? el("div", { class: "muted" }, `Quirks: ${s.quirks.join("; ")}`) : null,
              ),
            ),
          ]
        : null,

      t.possessions.length
        ? [
            el("h2", { class: "section" }, "Equipment"),
            el(
              "table",
              { class: "t" },
              el(
                "tbody",
                {},
                t.possessions.map((p) => el("tr", {}, el("td", {}, p.name, p.detail ? el("div", { class: "faint" }, p.detail) : null), el("td", { class: "muted" }, p.source))),
              ),
            ),
          ]
        : null,

      t.associates.length
        ? [
            el("h2", { class: "section" }, "People you know"),
            el(
              "div",
              {},
              assocKinds.flatMap((k) =>
                t.associates
                  .filter((a) => a.kind === k)
                  .map((a) => el("span", { class: `pill ${k}`, title: a.origin }, `${k[0]!.toUpperCase()}${k.slice(1)}${a.note ? `: ${a.note}` : ""}`, el("span", { class: "faint" }, ` · ${a.origin}`))),
              ),
            ),
          ]
        : null,

      t.traits.length || t.wounds.length
        ? [
            el("h2", { class: "section" }, "Traits and wounds"),
            el("ul", { style: "margin:0;padding-left:18px" }, [...t.traits, ...t.wounds.map((w) => `Wound: ${w}`), ...Object.entries(t.injuryLoss).map(([s, n]) => `${s} -${n} from injury, not restored`)].map((x) => el("li", {}, x))),
          ]
        : null,

      o.editable
        ? [
            el("h2", { class: "section" }, "Why are you travelling?"),
            el("textarea", {
              class: "inline",
              rows: 2,
              placeholder: "The lure of the unknown? A fortune? Running from the past?",
              value: t.goal,
              oninput: (e: Event) => {
                t.goal = (e.target as HTMLTextAreaElement).value;
                o.onEdit?.();
              },
            }),
            el("h2", { class: "section" }, "Notes"),
            el("textarea", {
              class: "inline",
              rows: 3,
              placeholder: "Appearance, quirks, names for your contacts...",
              value: t.notes,
              oninput: (e: Event) => {
                t.notes = (e.target as HTMLTextAreaElement).value;
                o.onEdit?.();
              },
            }),
          ]
        : t.goal || t.notes
          ? [el("h2", { class: "section" }, "Notes"), el("p", {}, [t.goal, t.notes].filter(Boolean).join(" "))]
          : null,

      t.history.length
        ? el(
            "details",
            { class: "hist", open: o.editable === true },
            el("summary", {}, "Previous history"),
            el(
              "ul",
              { class: "history" },
              t.history.filter((h) => h.kind !== "roll").map((h) => el("li", { class: h.kind ?? "" }, `${h.age}: ${h.text}`)),
            ),
          )
        : null,
    ),
  );
}
