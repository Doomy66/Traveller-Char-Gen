import { upp } from "../engine/character";
import { DEFAULT_SETTINGS, type Settings } from "../engine/context";
import { groupLevel, otherPosts, rollCrewMember, CREW_TRIES, type CrewMember } from "../engine/crew";
import { newSeed } from "../engine/dice";
import { careerLine, rankText, toCsv, toMarkdown, toText } from "../engine/export";
import { npcSpecies } from "../engine/npc";
import { CREW_POSITIONS, CREW_PRESETS, CREW_SERVICES, crewSalary, crewSkillText, crewVariant, findPosition, findService, rankLabels, serviceNeed, skillGroups, type CrewSkill } from "../rules/crew";
import { DESIGNER_SHIPS } from "../rules/ship-designs";
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
  /** With a service, the lowest rank that will do (0 for any). */
  rank: number;
}

interface CrewRequest {
  setting: Settings["setting"];
  /** "mixed" or a species id. */
  species: string;
  /** A service every member must be serving in, or "" for a civilian crew. */
  service: string;
  rows: CrewRow[];
}

/** Where earlier versions remembered the last crew asked for; cleared now that every visit starts afresh. */
const OLD_STORE = "traveller-char-gen.crew";

/** One row per post, counted from a preset (or nothing). */
function rowsFrom(counts: Record<string, number>): CrewRow[] {
  return CREW_POSITIONS.map((p) => ({ post: p.id, count: counts[p.id] ?? 0, min: 1, variant: 0, rank: 0 }));
}

function defaultRequest(): CrewRequest {
  return { setting: "core", species: "mixed", service: "", rows: rowsFrom(CREW_PRESETS.find((p) => p.name === "Free Trader")!.counts) };
}

function forgetOld(): void {
  try {
    localStorage.removeItem(OLD_STORE);
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

/** The post's skill as held: "Pilot (spacecraft) 2", "Pilot (spacecraft) 2, Astrogation 1", or "untrained". */
function bestSkill(m: CrewMember): string {
  return skillGroups(m.post)
    .map((group) => {
      const lv = groupLevel(m.t, group);
      if (lv < 0) return `${group.map(crewSkillText).join(" or ")}: untrained`;
      const s = group.find((x) => groupLevel(m.t, [x]) === lv) ?? group[0]!;
      return `${crewSkillText(s)} ${lv}`;
    })
    .join(", ");
}

/** A salary, or a dash where the crew table gives none. */
function pay(cr: number): string {
  return cr ? fmtCr(cr) : "-";
}

/** What a post needs, as text: "Pilot (spacecraft) and Astrogation". */
function needsText(p: { skills: CrewSkill[]; also?: CrewSkill[][] }): string {
  return skillGroups(p as Parameters<typeof skillGroups>[0]).map((g) => g.map(crewSkillText).join(" or ")).join(" and ");
}

/** Why a member is not what the service asked for: below the rank, or not serving at all. */
function shortRank(m: CrewMember): (string | HTMLElement)[] {
  const last = m.t.careers[m.t.careers.length - 1];
  if (last && m.need!.careers.includes(last.careerId)) return [rankText(last), el("div", { class: "faint" }, `${m.need!.service}: below the rank asked`)];
  return ["not serving", el("div", { class: "faint" }, m.need!.service)];
}

export function renderCrew(left: HTMLElement, sheet: HTMLElement): void {
  generation++;
  clear(left);
  clear(sheet);
  // Every visit starts afresh: a Free Trader's crew, any skill, level 1, no service.
  forgetOld();
  crew = [];
  const req = defaultRequest();

  const setting = el("select", {}, el("option", { value: "core", selected: req.setting === "core" }, "Third Imperium"), el("option", { value: "glorious-empire", selected: req.setting === "glorious-empire" }, "Glorious Empire"));
  const species = el("select", {});
  const fillSpecies = () => {
    clear(species);
    species.append(el("option", { value: "mixed" }, "Mixed, mostly " + (setting.value === "core" ? "human" : "Aslan")));
    for (const sp of SPECIES.filter((x) => x.settings.includes(setting.value as Settings["setting"]))) species.append(el("option", { value: sp.id, selected: sp.id === req.species }, sp.name));
  };
  setting.addEventListener("change", fillSpecies);
  const service = el("select", { title: "Every crew member must be serving in this service when rolled, so holds its rank" });
  const fillService = () => {
    const was = service.value || req.service;
    clear(service);
    service.append(el("option", { value: "" }, "None: a civilian crew"));
    for (const s of CREW_SERVICES.filter((x) => x.setting === setting.value)) service.append(el("option", { value: s.id, selected: s.id === was }, s.name));
  };
  setting.addEventListener("change", fillService);
  // The rank column depends on the service, so redraw the posts when it changes.
  // Ranks mean something different in each service, so a new service starts them at "any".
  const clearRanks = () => {
    for (const row of rows) row.rank = 0;
    drawPosts();
  };
  service.addEventListener("change", clearRanks);
  setting.addEventListener("change", clearRanks);
  fillService();
  fillSpecies();

  // Starting points: the Core ships' crew lines, and every ship the Ship Designer ships with, crewed by its own engine.
  const designerShips = DESIGNER_SHIPS;
  const groups = [...new Set(designerShips.map((x) => x.group))].sort((a, b) => (a === "High Guard 2022" ? -1 : b === "High Guard 2022" ? 1 : 0));
  const preset = el(
    "select",
    {},
    el("option", { value: "" }, "Choose a ship…"),
    el("optgroup", { label: "Core Rulebook" }, CREW_PRESETS.map((p, i) => el("option", { value: `crb:${i}` }, `${p.name} (CRB p${p.page})`))),
    groups.map((g) => el("optgroup", { label: g }, designerShips.map((x, i) => (x.group === g ? el("option", { value: `sd:${i}` }, `${x.name} (${x.tons.toLocaleString("en-GB")} t${x.military ? ", military" : ""})`) : null)))),
  );
  const shipNote = el("div", { class: "hint" });
  const fileInput = el("input", { type: "file", accept: ".ship,.json", hidden: true });
  const openShip = el("button", { type: "button", title: "Open a design saved by the Traveller Ship Designer and take its crew", onclick: () => fileInput.click() }, "Open a .ship file…");
  const useCrew = (name: string, counts: Record<string, number>, military: boolean, from: string) => {
    rows.splice(0, rows.length, ...rowsFrom(counts));
    drawPosts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    shipNote.textContent = `${name}: ${total.toLocaleString("en-GB")} crew, ${from}.${military ? " A military design: choose a Service to make it a service crew." : ""}${total > 200 ? " A large crew takes a while to roll." : ""}`;
  };
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const { crewFromDesign } = await import("./ship-import");
      const got = crewFromDesign(await file.text());
      preset.value = "";
      useCrew(got.name, got.counts, got.military, `from ${file.name} by the Ship Designer's crew table`);
    } catch (err) {
      shipNote.textContent = `${file.name} could not be read as a ship design: ${err instanceof Error ? err.message : String(err)}`;
    }
  });
  const rows = req.rows;
  const body = el("tbody");
  const drawPosts = () => {
    clear(body);
    rows.forEach((row, at) => {
      const p = findPosition(row.post);
      const first = rows.findIndex((x) => x.post === row.post) === at;
      const n = el("input", { type: "number", min: 0, max: 2000, value: String(row.count), style: "width:64px", oninput: (e: Event) => (row.count = Math.max(0, Math.min(2000, Math.round(Number((e.target as HTMLInputElement).value) || 0)))) });
      const m = el("select", { onchange: (e: Event) => (row.min = Number((e.target as HTMLSelectElement).value)) }, [0, 1, 2, 3, 4].map((lv) => el("option", { value: lv, selected: lv === row.min }, String(lv))));
      const svc = findService(service.value);
      const rk = svc
        ? el(
            "select",
            { title: `The lowest ${svc.name} rank that will do`, onchange: (e: Event) => (row.rank = Number((e.target as HTMLSelectElement).value)) },
            rankLabels(serviceNeed(svc, p)).map((label, i) => el("option", { value: i, selected: i === row.rank }, label)),
          )
        : el("select", { disabled: true, title: "Choose a service to ask for a rank" }, el("option", {}, "-"));
      const skill = p.options
        ? el(
            "select",
            { title: "The skill the post needs", onchange: (e: Event) => (row.variant = Number((e.target as HTMLSelectElement).value)) },
            el("option", { value: 0 }, needsText(p)),
            p.options.map((o, i) => el("option", { value: i + 1, selected: i + 1 === row.variant }, o.label)),
          )
        : needsText(p);
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
                  rows.splice(last + 1, 0, { post: row.post, count: 1, min: row.min, variant: 0, rank: row.rank });
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
          el("td", { class: "n" }, first ? pay(p.salary) : ""),
          el("td", { class: "n" }, n),
          el("td", { class: "n" }, m),
          el("td", {}, rk),
          el("td", {}, action),
        ),
      );
    });
  };
  const posts = el(
    "table",
    { class: "t crew-posts" },
    el("thead", {}, el("tr", {}, el("th", {}, "Post"), el("th", {}, "Skill"), el("th", { class: "n" }, "Cr/month"), el("th", { class: "n" }, "How many"), el("th", { class: "n" }, "Skill at least"), el("th", {}, "Rank at least"), el("th", {}))),
    body,
  );
  drawPosts();
  preset.addEventListener("change", () => {
    // A ship's crew is a fresh start: one row per post, any skill, level 1, any rank.
    const [kind, at] = preset.value.split(":") as [string, string];
    if (kind === "crb") {
      const p = CREW_PRESETS[Number(at)]!;
      useCrew(p.name, p.counts, false, `the crew line on CRB p${p.page}`);
    } else if (kind === "sd") {
      const x = designerShips[Number(at)]!;
      useCrew(x.name, x.counts, x.military, `by the Ship Designer's crew table (${x.group})`);
    }
  });

  const status = el("p", { class: "muted" });
  const results = el("div");
  const rollBtn = el("button", { class: "primary" }, "Roll the crew");
  const exportBtn = el("button", { onclick: () => exportCrew() }, "Export");

  const read = (): CrewRequest => ({ setting: setting.value as Settings["setting"], species: species.value, service: service.value, rows: rows.map((x) => ({ ...x })) });
  const needFor = (r: CrewRequest, row: CrewRow) => {
    const s = findService(r.service);
    return s ? serviceNeed(s, findPosition(row.post), row.rank) : undefined;
  };
  const settingsFor = (r: CrewRequest): Settings => ({ ...DEFAULT_SETTINGS, setting: r.setting });
  const speciesFor = (r: CrewRequest) => {
    if (r.species !== "mixed") return r.species;
    const only = findService(r.service)?.species;
    return only?.length ? only[Math.floor(Math.random() * only.length)]! : npcSpecies(r.setting);
  };
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
        el("thead", {}, el("tr", {}, el("th", {}, "Post"), el("th", {}, "Name"), el("th", {}, "UPP"), el("th", { class: "n" }, "Age"), crew.some((m) => m.need) ? el("th", {}, "Rank") : null, el("th", {}, "Skill"), el("th", { class: "n" }, "Cr/month"), el("th", {}, "Careers"), el("th", {}))),
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
              crew.some((x) => x.need) ? el("td", { class: m.need && !m.record ? "warn" : "" }, m.record ? [rankText(m.record), el("div", { class: "faint" }, m.need!.service)] : m.need ? shortRank(m) : "-") : null,
              el("td", { class: m.level >= m.min ? "" : "warn", title: m.met ? `Found on NPC ${m.tries}` : `None of ${m.tries} NPCs met the post; the best is shown` }, bestSkill(m), m.level >= m.min ? null : el("div", { class: "faint" }, "short of the level asked")),
              el("td", { class: "n" }, pay(crewSalary(p, m.level))),
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
                      const fresh = await rollCrewMember(p, m.min, settingsFor(r), speciesFor(r), seeds, CREW_TRIES, m.need);
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
      el("p", {}, `${crew.length} crew, payroll ${fmtCr(payroll)} a month.`, short ? el("span", { class: "warn" }, ` ${short} could not be filled as asked; the best found is shown.`) : null),
      el("p", { class: "faint" }, "Salary is the table's figure at level 1, half as much again for each level above. Click a row for the sheet."),
    );
  };

  rollBtn.addEventListener("click", async () => {
    const r = read();
    const wanted = r.rows.flatMap((row) => Array.from({ length: row.count }, () => ({ p: crewVariant(findPosition(row.post), row.variant), min: row.min, need: needFor(r, row) })));
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
      for (const [i, { p, min, need }] of wanted.entries()) {
        status.textContent = `Rolling ${p.name.toLowerCase()} (${i + 1} of ${wanted.length})…`;
        // Let the page draw between posts.
        await new Promise((res) => setTimeout(res, 0));
        const m = await rollCrewMember(p, min, settingsFor(r), speciesFor(r), seeds, CREW_TRIES, need);
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
    el("div", { class: "setup" }, el("label", {}, "Setting"), setting, el("label", {}, "Species"), species, el("label", {}, "Service"), service, el("label", {}, "Start from"), el("div", { class: "row" }, preset, openShip, fileInput), shipNote),
    posts,
    el("div", { class: "begin" }, rollBtn, exportBtn, el("button", { type: "button", title: "Back to the Free Trader crew with every choice cleared", onclick: () => renderCrew(left, sheet) }, "Start afresh")),
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
          onclick: () => download("crew.csv", toCsv(list, { headers: ["Post", "Post skill", "Salary", "Service", "Rank"], cells: (_t, i) => [post(crew[i]!).name, bestSkill(crew[i]!), String(crewSalary(post(crew[i]!), crew[i]!.level)), crew[i]!.need?.service ?? "", crew[i]!.record ? rankText(crew[i]!.record!) : ""] }), "text/csv"),
        },
        "CSV",
      ),
      el("button", { onclick: () => download("crew.md", crew.map((m) => `## ${post(m).name}: ${m.t.name}\n\n${bestSkill(m)}, ${pay(crewSalary(post(m), m.level))} a month.${m.record ? ` ${m.need!.service}, ${rankText(m.record)}.` : ""}\n\n${toMarkdown(m.t, false)}`).join("\n\n---\n\n"), "text/markdown") }, "Markdown"),
      el("button", { onclick: () => download("crew.txt", crew.map((m) => `${post(m).name.toUpperCase()}: ${bestSkill(m)}, ${pay(crewSalary(post(m), m.level))} a month${m.record ? `, ${m.need!.service} ${rankText(m.record)}` : ""}\n${toText(m.t)}`).join("\n\n")) }, "Text"),
      el("button", { onclick: () => d.close() }, "Close"),
    ),
  );
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}
