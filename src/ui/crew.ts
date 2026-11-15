import { upp } from "../engine/character";
import { DEFAULT_SETTINGS, type Settings } from "../engine/context";
import { crewLevel, otherPosts, rollCrewMember, CREW_TRIES, type CrewMember } from "../engine/crew";
import { newSeed } from "../engine/dice";
import { careerLine, toCsv, toMarkdown, toText } from "../engine/export";
import { npcSpecies } from "../engine/npc";
import { CREW_POSITIONS, CREW_PRESETS, crewSalary, crewSkillText, crewVariant, type CrewPosition } from "../rules/crew";
import { SPECIES } from "../rules/species";
import { clear, download, el, fmtCr } from "./dom";
import { renderSheet } from "./sheet";

/**
 * Roll a crew: how many of each post and the skill level wanted, then an NPC
 * for each post who has it. CharSpec 12.
 */

interface CrewRequest {
  setting: Settings["setting"];
  /** "mixed" or a species id. */
  species: string;
  counts: Record<string, number>;
  min: Record<string, number>;
  /** Which of a post's options is insisted on; 0 or missing for the post as it is. */
  variant?: Record<string, number>;
}

const STORE = "traveller-char-gen.crew";
const DEFAULT_REQUEST: CrewRequest = { setting: "core", species: "mixed", counts: { ...CREW_PRESETS.find((p) => p.name === "Free Trader")!.counts }, min: {} };

function recall(): CrewRequest {
  try {
    const s = localStorage.getItem(STORE);
    return s ? { ...DEFAULT_REQUEST, ...(JSON.parse(s) as Partial<CrewRequest>) } : structuredClone(DEFAULT_REQUEST);
  } catch {
    return structuredClone(DEFAULT_REQUEST);
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
  const counts = new Map<string, HTMLInputElement>();
  const mins = new Map<string, HTMLSelectElement>();
  const variants = new Map<string, HTMLSelectElement>();
  const posts = el(
    "table",
    { class: "t crew-posts" },
    el("thead", {}, el("tr", {}, el("th", {}, "Post"), el("th", {}, "Skill"), el("th", { class: "n" }, "Cr/month"), el("th", { class: "n" }, "How many"), el("th", { class: "n" }, "At least"))),
    el(
      "tbody",
      {},
      CREW_POSITIONS.map((p) => {
        const n = el("input", { type: "number", min: 0, max: 20, value: String(req.counts[p.id] ?? 0), style: "width:56px" });
        const m = el("select", {}, [0, 1, 2, 3, 4].map((lv) => el("option", { value: lv, selected: lv === (req.min[p.id] ?? 1) }, String(lv))));
        counts.set(p.id, n);
        const skillCell = p.options
          ? (() => {
              const v = el("select", { title: "The skill the post needs" }, el("option", { value: 0 }, p.skills.map(crewSkillText).join(" or ")), p.options.map((o, i) => el("option", { value: i + 1, selected: i + 1 === (req.variant?.[p.id] ?? 0) }, o.label)));
              variants.set(p.id, v);
              return v;
            })()
          : p.skills.map(crewSkillText).join(" or ");
        mins.set(p.id, m);
        return el(
          "tr",
          {},
          el("td", {}, p.name, p.note ? el("div", { class: "faint" }, p.note) : null),
          el("td", { class: "muted" }, skillCell),
          el("td", { class: "n" }, fmtCr(p.salary)),
          el("td", { class: "n" }, n),
          el("td", { class: "n" }, m),
        );
      }),
    ),
  );
  preset.addEventListener("change", () => {
    const p = CREW_PRESETS.find((x) => x.name === preset.value);
    if (!p) return;
    for (const [id, input] of counts) input.value = String(p.counts[id] ?? 0);
  });

  const status = el("p", { class: "muted" });
  const results = el("div");
  const rollBtn = el("button", { class: "primary" }, "Roll the crew");
  const exportBtn = el("button", { onclick: () => exportCrew() }, "Export");

  const read = (): CrewRequest => {
    const r: CrewRequest = { setting: setting.value as Settings["setting"], species: species.value, counts: {}, min: {}, variant: {} };
    for (const p of CREW_POSITIONS) {
      const v = variants.get(p.id);
      if (v) r.variant![p.id] = Number(v.value);
      r.counts[p.id] = Math.max(0, Math.min(20, Math.round(Number(counts.get(p.id)!.value) || 0)));
      r.min[p.id] = Number(mins.get(p.id)!.value);
    }
    return r;
  };
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
              el("td", { class: m.met ? "" : "warn", title: m.met ? `Found on NPC ${m.tries}` : `None of ${m.tries} NPCs reached level ${req.min[p.id] ?? 1}; the best is shown` }, bestSkill(m), m.met ? null : el("div", { class: "faint" }, "short of the level asked")),
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
                      const fresh = await rollCrewMember(crewVariant(p, r.variant?.[p.id] ?? 0), r.min[p.id] ?? 1, settingsFor(r), speciesFor(r), seeds);
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
    req.setting = r.setting;
    req.species = r.species;
    req.counts = r.counts;
    req.variant = r.variant;
    req.min = r.min;
    store(r);
    const wanted = CREW_POSITIONS.flatMap((p) => Array.from({ length: r.counts[p.id] ?? 0 }, () => p));
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
      for (const [i, p] of wanted.entries()) {
        status.textContent = `Rolling ${p.name.toLowerCase()} (${i + 1} of ${wanted.length})…`;
        // Let the page draw between posts.
        await new Promise((res) => setTimeout(res, 0));
        const m = await rollCrewMember(crewVariant(p as CrewPosition, r.variant?.[p.id] ?? 0), r.min[p.id] ?? 1, settingsFor(r), speciesFor(r), seeds);
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
