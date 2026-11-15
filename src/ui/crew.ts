import { upp } from "../engine/character";
import { DEFAULT_SETTINGS, type Settings } from "../engine/context";
import { crewLevel, otherPosts, rollCrewMember, CREW_TRIES, type CrewMember } from "../engine/crew";
import { newSeed } from "../engine/dice";
import { careerLine, toCsv, toMarkdown, toText } from "../engine/export";
import { npcSpecies } from "../engine/npc";
import { CREW_POSITIONS, CREW_PRESETS, crewSalary, crewSkillText, crewVariant, findPosition } from "../rules/crew";
import { SPECIES } from "../rules/species";
import { clear, download, el, fmtCr } from "./dom";
import { renderSheet } from "./sheet";

/**
 * Roll a crew: how many of each post and the skill level wanted, then an NPC
 * for each post who has it. CharSpec 12.
 */

/** One line of the posts table. A post with options may have several, one per speciality wanted. */
interface CrewRow {
  post: string;
  count: number;
  min: number;
  /** Which of the post's options is insisted on; 0 for the post as it is. */
  variant: number;
}

interface CrewRequest {
  setting: Settings["setting"];
  /** "mixed" or a species id. */
  species: string;
  rows: CrewRow[];
}

/** Saved before rows existed: one count, level and option per post. */
interface OldCrewRequest {
  counts?: Record<string, number>;
  min?: Record<string, number>;
  variant?: Record<string, number>;
}

const STORE = "traveller-char-gen.crew";

/** One row per post, counted from a preset (or nothing). */
function rowsFrom(counts: Record<string, number>, min: Record<string, number> = {}, variant: Record<string, number> = {}): CrewRow[] {
  return CREW_POSITIONS.map((p) => ({ post: p.id, count: counts[p.id] ?? 0, min: min[p.id] ?? 1, variant: variant[p.id] ?? 0 }));
}

function defaultRequest(): CrewRequest {
  return { setting: "core", species: "mixed", rows: rowsFrom(CREW_PRESETS.find((p) => p.name === "Free Trader")!.counts) };
}

function recall(): CrewRequest {
  try {
    const s = localStorage.getItem(STORE);
    if (!s) return defaultRequest();
    const saved = JSON.parse(s) as Partial<CrewRequest> & OldCrewRequest;
    const r = defaultRequest();
    if (saved.setting) r.setting = saved.setting;
    if (saved.species) r.species = saved.species;
    if (Array.isArray(saved.rows)) {
      const known = saved.rows.filter((x) => CREW_POSITIONS.some((p) => p.id === x.post));
      // Every post keeps at least one row, in table order.
      r.rows = CREW_POSITIONS.flatMap((p) => {
        const mine = known.filter((x) => x.post === p.id);
        return mine.length ? mine : [{ post: p.id, count: 0, min: 1, variant: 0 }];
      });
    } else if (saved.counts) r.rows = rowsFrom(saved.counts, saved.min, saved.variant);
    return r;
  } catch {
    return defaultRequest();
  }
}
function store(r: CrewRequest): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(r));
  } catch {
    /* private window: nothing to do */
  }
}

let crew: CrewMember[] = [];
/** Bumped whenever a roll starts or the screen is left, so a stale roll stops. */
let generation = 0;

export function leaveCrew(): void {
  generation++;
}

/** The post's skill as held: "Pilot (spacecraft) 2", or "untrained". */
function bestSkill(m: CrewMember): string {
  const p = m.post;
  if (m.level < 0) return `${p.skills.map(crewSkillText).join(" or ")}: untrained`;
  let text = crewSkillText(p.skills[0]!);
  for (const s of p.skills) {
    const one = { ...p, skills: [s] };
    if (crewLevel(m.t, one) === m.level) {
      text = crewSkillText(s);
      break;
    }
  }
  return `${text} ${m.level}`;
}

export function renderCrew(left: HTMLElement, sheet: HTMLElement): void {
  generation++;
  clear(left);
  clear(sheet);
  const req = recall();

  const setting = el("select", {}, el("option", { value: "core", selected: req.setting === "core" }, "Third Imperium"), el("option", { value: "glorious-empire", selected: req.setting === "glorious-empire" }, "Glorious Empire"));
  const species = el("select", {});
  const fillSpecies = () => {
    clear(species);
    species.append(el("option", { value: "mixed" }, "Mixed, mostly " + (setting.value === "core" ? "human" : "Aslan")));
    for (const sp of SPECIES.filter((x) => x.settings.includes(setting.value as Settings["setting"]))) species.append(el("option", { value: sp.id, selected: sp.id === req.species }, sp.name));
  };
  setting.addEventListener("change", fillSpecies);
  fillSpecies();

  const preset = el("select", {}, el("option", { value: "" }, "Choose a Core ship…"), CREW_PRESETS.map((p) => el("option", { value: p.name }, `${p.name} (CRB p${p.page})`)));
  const rows = req.rows;
  const body = el("tbody");
  const drawPosts = () => {
    clear(body);
    rows.forEach((row, at) => {
      const p = findPosition(row.post);
      const first = rows.findIndex((x) => x.post === row.post) === at;
      const n = el("input", { type: "number", min: 0, max: 20, value: String(row.count), style: "width:56px", oninput: (e: Event) => (row.count = Math.max(0, Math.min(20, Math.round(Number((e.target as HTMLInputElement).value) || 0)))) });
      const m = el("select", { onchange: (e: Event) => (row.min = Number((e.target as HTMLSelectElement).value)) }, [0, 1, 2, 3, 4].map((lv) => el("option", { value: lv, selected: lv === row.min }, String(lv))));
      const skill = p.options
        ? el(
            "select",
            { title: "The skill the post needs", onchange: (e: Event) => (row.variant = Number((e.target as HTMLSelectElement).value)) },
            el("option", { value: 0 }, p.skills.map(crewSkillText).join(" or ")),
            p.options.map((o, i) => el("option", { value: i + 1, selected: i + 1 === row.variant }, o.label)),
          )
        : p.skills.map(crewSkillText).join(" or ");
      const action = !p.options
        ? null
        : first
          ? el(
              "button",
              {
                type: "button",
                class: "row-btn",
                title: `Another ${p.name.toLowerCase()} row, for a different speciality or level`,
                onclick: () => {
                  const last = rows.map((x) => x.post).lastIndexOf(row.post);
                  rows.splice(last + 1, 0, { post: row.post, count: 1, min: row.min, variant: 0 });
                  drawPosts();
                },
              },
              "+",
            )
          : el("button", { type: "button", class: "row-btn", title: "Remove this row", onclick: () => (rows.splice(at, 1), drawPosts()) }, "×");
      body.append(
        el(
          "tr",
          { class: first ? "" : "extra" },
          el("td", {}, first ? [p.name, p.note ? el("div", { class: "faint" }, p.note) : null] : el("span", { class: "faint" }, `another ${p.name.toLowerCase()}`)),
          el("td", { class: "muted" }, skill),
          el("td", { class: "n" }, first ? fmtCr(p.salary) : ""),
          el("td", { class: "n" }, n),
          el("td", { class: "n" }, m),
          el("td", {}, action),
        ),
      );
    });
  };
  const posts = el(
    "table",
    { class: "t crew-posts" },
    el("thead", {}, el("tr", {}, el("th", {}, "Post"), el("th", {}, "Skill"), el("th", { class: "n" }, "Cr/month"), el("th", { class: "n" }, "How many"), el("th", { class: "n" }, "At least"), el("th", {}))),
    body,
  );
  drawPosts();
  preset.addEventListener("change", () => {
    const p = CREW_PRESETS.find((x) => x.name === preset.value);
    if (!p) return;
    // The ship's crew line, one row per post; levels and specialities chosen are kept.
    const kept = rowsFrom(p.counts);
    for (const row of kept) {
      const old = rows.find((x) => x.post === row.post);
      if (old) {
        row.min = old.min;
        row.variant = old.variant;
      }
    }
    rows.splice(0, rows.length, ...kept);
    drawPosts();
  });

  const status = el("p", { class: "muted" });
  const results = el("div");
  const rollBtn = el("button", { class: "primary" }, "Roll the crew");
  const exportBtn = el("button", { onclick: () => exportCrew() }, "Export");

  const read = (): CrewRequest => ({ setting: setting.value as Settings["setting"], species: species.value, rows: rows.map((x) => ({ ...x })) });
  const settingsFor = (r: CrewRequest): Settings => ({ ...DEFAULT_SETTINGS, setting: r.setting });
  const speciesFor = (r: CrewRequest) => (r.species === "mixed" ? npcSpecies(r.setting) : r.species);
  const seeds = () => newSeed();

  let selected = -1;
  const show = (i: number) => {
    selected = i;
    const m = crew[i];
    if (m) renderSheet(sheet, m.t, { editable: true });
    draw();
  };

  const draw = () => {
    clear(results);
    exportBtn.disabled = crew.length === 0;
    if (!crew.length) return;
    const payroll = crew.reduce((s, m) => s + crewSalary(m.post, m.level), 0);
    const short = crew.filter((m) => !m.met).length;
    results.append(
      el("h2", { class: "section" }, "The crew"),
      el(
        "table",
        { class: "t crowd crew" },
        el("thead", {}, el("tr", {}, el("th", {}, "Post"), el("th", {}, "Name"), el("th", {}, "UPP"), el("th", { class: "n" }, "Age"), el("th", {}, "Skill"), el("th", { class: "n" }, "Cr/month"), el("th", {}, "Careers"), el("th", {}))),
        el(
          "tbody",
          {},
          crew.map((m, i) => {
            const p = m.post;
            const also = otherPosts(m.t, p.id).map((x) => x.name);
            return el(
              "tr",
              { class: i === selected ? "on" : "", onclick: () => show(i) },
              el("td", {}, p.name),
              el("td", {}, m.t.name, el("div", { class: "faint" }, SPECIES.find((s) => s.id === m.t.speciesId)?.name ?? "")),
              el("td", { style: "font-family:monospace" }, upp(m.t)),
              el("td", { class: "n" }, m.t.age),
              el("td", { class: m.met ? "" : "warn", title: m.met ? `Found on NPC ${m.tries}` : `None of ${m.tries} NPCs reached level ${m.min}; the best is shown` }, bestSkill(m), m.met ? null : el("div", { class: "faint" }, "short of the level asked")),
              el("td", { class: "n" }, fmtCr(crewSalary(p, m.level))),
              el("td", { class: "muted" }, m.t.careers.map(careerLine).join("; "), also.length ? el("div", { class: "faint" }, `Could also be: ${also.join(", ")}`) : null),
              el(
                "td",
                {},
                el(
                  "button",
                  {
                    type: "button",
                    title: "Roll a different NPC for this post",
                    onclick: async (e: Event) => {
                      e.stopPropagation();
                      const r = read();
                      const g = generation;
                      status.textContent = `Rolling another ${p.name.toLowerCase()}…`;
                      const fresh = await rollCrewMember(p, m.min, settingsFor(r), speciesFor(r), seeds);
                      if (g !== generation) return;
                      crew[i] = fresh;
                      status.textContent = "";
                      show(i);
                    },
                  },
                  "Reroll",
                ),
              ),
            );
          }),
        ),
      ),
      el("p", {}, `${crew.length} crew, payroll ${fmtCr(payroll)} a month.`, short ? el("span", { class: "warn" }, ` ${short} short of the level asked.`) : null),
      el("p", { class: "faint" }, "Salary is the table's figure at level 1, half as much again for each level above. Click a row for the sheet."),
    );
  };

  rollBtn.addEventListener("click", async () => {
    const r = read();
    store(r);
    const wanted = r.rows.flatMap((row) => Array.from({ length: row.count }, () => ({ p: crewVariant(findPosition(row.post), row.variant), min: row.min })));
    if (!wanted.length) {
      status.textContent = "Ask for at least one post.";
      return;
    }
    const g = ++generation;
    rollBtn.disabled = true;
    crew = [];
    selected = -1;
    draw();
    try {
      for (const [i, { p, min }] of wanted.entries()) {
        status.textContent = `Rolling ${p.name.toLowerCase()} (${i + 1} of ${wanted.length})…`;
        // Let the page draw between posts.
        await new Promise((res) => setTimeout(res, 0));
        const m = await rollCrewMember(p, min, settingsFor(r), speciesFor(r), seeds);
        if (g !== generation) return;
        crew.push(m);
        draw();
      }
      status.textContent = "";
      show(0);
    } finally {
      rollBtn.disabled = false;
    }
  });

  left.append(
    el("h2", { class: "section" }, "Roll a crew"),
    el("p", { class: "muted" }, `Say how many of each post and the skill level wanted. Each post is filled by rolling NPCs by the ordinary rules, steered towards the careers that teach the job, until one has the skill (up to ${CREW_TRIES} tries; otherwise the best of them).`),
    el("div", { class: "setup" }, el("label", {}, "Setting"), setting, el("label", {}, "Species"), species, el("label", {}, "Start from"), preset),
    posts,
    el("div", { class: "begin" }, rollBtn, exportBtn),
    status,
    results,
  );
  draw();
}

export function exportCrew(): void {
  if (!crew.length) return;
  const post = (m: CrewMember) => m.post;
  const list = crew.map((m) => m.t);
  const d = el(
    "dialog",
    {},
    el("h3", { style: "margin-top:0" }, `Export a crew of ${crew.length}`),
    el(
      "div",
      { class: "begin" },
      el(
        "button",
        {
          class: "primary",
          onclick: () => download("crew.csv", toCsv(list, { headers: ["Post", "Post skill", "Salary"], cells: (_t, i) => [post(crew[i]!).name, bestSkill(crew[i]!), String(crewSalary(post(crew[i]!), crew[i]!.level))] }), "text/csv"),
        },
        "CSV",
      ),
      el("button", { onclick: () => download("crew.md", crew.map((m) => `## ${post(m).name}: ${m.t.name}\n\n${bestSkill(m)}, ${fmtCr(crewSalary(post(m), m.level))} a month.\n\n${toMarkdown(m.t, false)}`).join("\n\n---\n\n"), "text/markdown") }, "Markdown"),
      el("button", { onclick: () => download("crew.txt", crew.map((m) => `${post(m).name.toUpperCase()}: ${bestSkill(m)}, ${fmtCr(crewSalary(post(m), m.level))} a month\n${toText(m.t)}`).join("\n\n")) }, "Text"),
      el("button", { onclick: () => d.close() }, "Close"),
    ),
  );
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}
