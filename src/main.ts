import "./style.css";
import "./app.css";
import { emptyTraveller, upp, type Gender, type Traveller } from "./engine/character";
import { DEFAULT_SETTINGS, type Settings } from "./engine/context";
import { newSeed } from "./engine/dice";
import { makeNpc, npcSpecies } from "./engine/npc";
import { careerLine, toCsv, toMarkdown, toText } from "./engine/export";
import { randomName } from "./rules/names";
import { SPECIES } from "./rules/species";
import { ScreenAnswerer } from "./ui/ask";
import { clear, download, el, fmtCr, toast } from "./ui/dom";
import { exportCrew, leaveCrew, renderCrew } from "./ui/crew";
import { renderRules } from "./ui/rules";
import { Session, type SavedTraveller } from "./ui/session";
import { renderSheet } from "./ui/sheet";
import { renderShop } from "./ui/shop";
import { APP_VERSION, HELP, RELEASE_NOTES } from "./version";

/**
 * The application: a landing, a setup form, the conversation that makes a
 * Traveller, the finished sheet, a crowd of NPCs and a rules browser.
 * CharSpec 10.
 */

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const left = $("left");
const sheet = $("sheet");
const barSub = $("bar-sub");
const STORE = "traveller-char-gen.session";
const SETTINGS_STORE = "traveller-char-gen.settings";

let session: Session | undefined;
let answerer: ScreenAnswerer | undefined;
let mode: "setup" | "create" | "done" | "crowd" | "crew" | "rules" | "npc" = "setup";

$("landing-version").textContent = `Version ${APP_VERSION}`;
($("landing-help") as HTMLAnchorElement).href = HELP;
($("landing-notes") as HTMLAnchorElement).href = RELEASE_NOTES;

// ---------------------------------------------------------------- storage

function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private window or full: nothing to do */
  }
}
function recall<T>(key: string): T | undefined {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : undefined;
  } catch {
    return undefined;
  }
}
let saveTimer: number | undefined;
function autosave(): void {
  if (!session) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => store(STORE, session!.save()), 300);
}
if (recall<SavedTraveller>(STORE)) $("landing-resume").hidden = false;

// ---------------------------------------------------------------- screens

function show(screen: "landing" | "work"): void {
  document.body.classList.toggle("at-landing", screen === "landing");
}

function bar(): void {
  const creating = mode === "create" || mode === "done";
  $<HTMLButtonElement>("btn-undo").hidden = !creating;
  $<HTMLButtonElement>("btn-auto").hidden = mode !== "create";
  $<HTMLButtonElement>("btn-save").hidden = !creating && mode !== "npc";
  $<HTMLButtonElement>("btn-export").hidden = !(creating || mode === "npc" || mode === "crowd" || mode === "crew");
  $<HTMLButtonElement>("btn-print").hidden = mode === "setup" || mode === "rules";
  $<HTMLButtonElement>("btn-undo").disabled = !session || session.decisions === 0;
  if (session && (mode === "create" || mode === "done")) {
    const t = session.t;
    barSub.textContent = `${t.name || "New Traveller"} · ${upp(t)} · age ${t.age}${mode === "done" ? " · finished" : ""}`;
  } else barSub.textContent = { setup: "New Traveller", crowd: "A crowd of NPCs", crew: "A ship's crew", rules: "The rules", npc: "Quick NPC", create: "", done: "" }[mode];
}

$("home").addEventListener("click", () => {
  answerer?.cancel();
  if (session?.ctx) session.ctx.aborted = true;
  leaveCrew();
  show("landing");
  if (recall<SavedTraveller>(STORE)) $("landing-resume").hidden = false;
});

// ---------------------------------------------------------------- setup

function setupScreen(): void {
  mode = "setup";
  show("work");
  bar();
  const saved = recall<Partial<Settings>>(SETTINGS_STORE) ?? {};
  const s: Settings = { ...DEFAULT_SETTINGS, ...saved };
  const t = emptyTraveller();
  clear(left);
  clear(sheet);

  const name = el("input", { type: "text", placeholder: "Name your Traveller first; trust the book on this", value: "" });
  const rollName = el("button", { type: "button", title: "A random name", onclick: () => (name.value = randomName(Math.random, species.value)) }, "Random");
  const gender = el("select", {}, el("option", { value: "female" }, "Female"), el("option", { value: "male" }, "Male"), el("option", { value: "other", selected: true }, "Other or unstated"));
  const homeworld = el("input", { type: "text", placeholder: "Optional: name and UWP, e.g. Regina A788899-C" });
  const setting = el("select", {}, el("option", { value: "core", selected: s.setting === "core" }, "Third Imperium (Core Rulebook)"), el("option", { value: "glorious-empire", selected: s.setting === "glorious-empire" }, "Glorious Empire (Aslan and their slaves)"));
  const species = el("select", {});
  const fillSpecies = () => {
    clear(species);
    for (const sp of SPECIES.filter((x) => x.settings.includes(setting.value as Settings["setting"]))) species.append(el("option", { value: sp.id }, sp.name));
    speciesNote.textContent = SPECIES.find((x) => x.id === species.value)?.description ?? "";
  };
  const speciesNote = el("div", { class: "hint" });
  setting.addEventListener("change", fillSpecies);
  species.addEventListener("change", () => (speciesNote.textContent = SPECIES.find((x) => x.id === species.value)?.description ?? ""));
  const statMethod = el(
    "select",
    {},
    el("option", { value: "assign", selected: s.statMethod === "assign" }, "Roll six times, arrange as you like"),
    el("option", { value: "order", selected: s.statMethod === "order" }, "Roll in order, STR to SOC"),
    el("option", { value: "manual", selected: s.statMethod === "manual" }, "Type in characteristics rolled elsewhere"),
  );
  const check = (label: string, on: boolean, hint: string) => {
    const box = el("input", { type: "checkbox", checked: on });
    return { box, row: [el("label", { class: "check full" }, box, label), el("div", { class: "hint" }, hint)] };
  };
  const psi = check("Psionics are in play", s.psionics, "PSI is tested only with the referee's leave (CRB p228); off, psionic events come to nothing.");
  const basic = check("Basic training replaces the first term's skill roll", s.basicTrainingReplacesRoll, "As CRB p18 reads. Off, a first term gets basic training and a skill roll too.");
  const manual = check("I roll my own dice", s.manualDice, "Every roll asks for the dice you threw.");
  const group = el("input", { type: "number", min: 1, max: 12, value: String(s.groupSize), style: "width:70px" });
  fillSpecies();

  const begin = (auto: boolean) => {
    const settings: Settings = {
      setting: setting.value as Settings["setting"],
      statMethod: statMethod.value as Settings["statMethod"],
      psionics: psi.box.checked,
      basicTrainingReplacesRoll: basic.box.checked,
      manualDice: manual.box.checked && !auto,
      groupSize: Math.max(1, Number(group.value) || 4),
    };
    store(SETTINGS_STORE, settings);
    t.name = name.value.trim() || (auto ? randomName(Math.random, species.value) : "");
    t.speciesId = species.value;
    t.gender = gender.value as Gender;
    t.homeworld = homeworld.value.trim();
    session = new Session(t, settings);
    startCreation(auto);
  };

  left.append(
    el("h2", { class: "section" }, "A new Traveller"),
    el(
      "div",
      { class: "setup" },
      el("label", {}, "Name"),
      el("div", { class: "row" }, name, rollName),
      el("label", {}, "Setting"),
      setting,
      el("label", {}, "Species"),
      species,
      speciesNote,
      el("label", {}, "Gender"),
      gender,
      el("div", { class: "hint" }, "Matters only in the Glorious Empire, where some assignments are for one sex."),
      el("label", {}, "Homeworld"),
      homeworld,
      el("label", {}, "Characteristics"),
      statMethod,
      el("label", {}, "Players"),
      el("div", { class: "row" }, group, el("span", { class: "muted" }, "in the group, to share out the skills package")),
      psi.row,
      basic.row,
      manual.row,
    ),
    el("div", { class: "begin" }, el("button", { class: "primary", onclick: () => begin(false) }, "Begin"), el("button", { onclick: () => begin(true) }, "Roll it all for me")),
  );
  sheet.append(
    el("h2", { class: "section" }, "How it goes"),
    el(
      "ol",
      { class: "muted", style: "padding-left:18px;line-height:1.7" },
      el("li", {}, "Roll characteristics and pick background skills."),
      el("li", {}, "Each four-year term: university, an academy, or a career. Qualify, train, survive, meet the term's event, advance."),
      el("li", {}, "Leave a career to muster out: cash, gear, ship shares, contacts."),
      el("li", {}, "From the fourth term, age. Anagathics hold it back, at a price."),
      el("li", {}, "Stop when you like: pick the group's skills package, add connections, buy starting gear."),
    ),
    el("p", { class: "muted" }, "Every roll is in the history. Undo takes back the last decision you made, dice and all after it."),
  );
  name.focus();
}

// ---------------------------------------------------------------- creation

function historyList(t: Traveller): HTMLElement {
  return el(
    "ul",
    { class: "history" },
    t.history.map((h) => el("li", { class: `${h.kind ?? ""}${/^Term \d+ \(age/.test(h.text) ? " term" : ""}` }, h.text)),
  );
}

let histHost: HTMLElement;
let askHost: HTMLElement;
function drawCreation(): void {
  if (!session) return;
  const t = session.t;
  clear(histHost);
  histHost.append(historyList(t));
  renderSheet(sheet, t, mode === "done" ? { editable: true, onEdit: () => (session!.capturePost(), autosave(), bar()) } : {});
  bar();
  autosave();
}

function startCreation(auto: boolean, replay = session?.transcript ?? []): void {
  if (!session) return;
  mode = "create";
  show("work");
  answerer?.cancel();
  clear(left);
  histHost = el("div");
  askHost = el("div");
  left.append(histHost, askHost);
  answerer = new ScreenAnswerer(() => askHost, Math.random, () => {
    drawCreation();
    left.scrollTop = left.scrollHeight;
  });
  if (auto) answerer.auto = true;
  const s = session;
  bar();
  void s.run(answerer, replay, () => drawCreation()).then(() => {
    if (session !== s || s.running) return;
    if (s.error) {
      askHost.append(el("div", { class: "ask" }, el("h3", { class: "warn" }, "Something went wrong"), el("p", {}, String(s.error)), el("p", { class: "muted" }, "Undo and try another path, and please report it.")));
      return;
    }
    if (s.ctx && !s.ctx.aborted) doneScreen();
  });
}

function doneScreen(): void {
  if (!session) return;
  mode = "done";
  const t = session.t;
  clear(askHost);
  const shopHost = el("div");
  askHost.append(
    el(
      "div",
      { class: "ask done" },
      el("h3", {}, t.dead ? "The Traveller did not survive." : `${t.name || "Your Traveller"} is ready to travel.`),
      el("p", { class: "detail" }, `Age ${t.age}, ${fmtCr(t.cash)} in hand${t.debt ? `, ${fmtCr(t.debt)} owed` : ""}. Name them, say why they travel, and spend up to Cr10,000 on gear.`),
      el(
        "div",
        { class: "foot" },
        el("button", { class: "primary", onclick: () => saveFile() }, "Save"),
        el("button", { onclick: () => exportDialog(t) }, "Export"),
        el("button", { onclick: () => window.print() }, "Print"),
        el("button", { onclick: () => setupScreen() }, "Another"),
      ),
    ),
    shopHost,
  );
  if (!t.dead) renderShop(shopHost, t, session.post.purchases, () => (renderSheet(sheet, t, { editable: true, onEdit: () => (session!.capturePost(), autosave()) }), autosave()));
  drawCreation();
}

$("btn-undo").addEventListener("click", undo);
function undo(): void {
  if (!session || mode === "setup") return;
  const tr = session.undoTranscript();
  if (!tr) return;
  session.capturePost();
  startCreation(false, tr);
}
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "z" && (mode === "create" || mode === "done") && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
    e.preventDefault();
    undo();
  }
});
$("btn-auto").addEventListener("click", () => answerer?.finishForMe());
$("btn-print").addEventListener("click", () => window.print());
$("btn-save").addEventListener("click", () => saveFile());
$("btn-export").addEventListener("click", () => {
  if (mode === "crowd") exportCrowd();
  else if (mode === "crew") exportCrew();
  else if (session) exportDialog(session.t);
  else if (npc) exportDialog(npc);
});

function fileName(t: Traveller, ext: string): string {
  return `${(t.name || "traveller").replace(/[^\w\- ]+/g, "").trim() || "traveller"}.${ext}`;
}

function saveFile(): void {
  if (mode === "npc" && npc) {
    download(fileName(npc, "md"), toMarkdown(npc), "text/markdown");
    return;
  }
  if (!session) return;
  download(fileName(session.t, "traveller"), JSON.stringify(session.save(), null, 1), "application/json");
  toast("Saved");
}

function exportDialog(t: Traveller): void {
  const text = toText(t);
  const pre = el("pre", {}, text);
  const d = el(
    "dialog",
    {},
    el("h3", { style: "margin-top:0" }, "Export"),
    pre,
    el(
      "div",
      { class: "begin" },
      el("button", { class: "primary", onclick: () => navigator.clipboard?.writeText(text).then(() => toast("Copied")) }, "Copy text"),
      el("button", { onclick: () => download(fileName(t, "md"), toMarkdown(t), "text/markdown") }, "Download Markdown"),
      el("button", { onclick: () => download(fileName(t, "txt"), text) }, "Download text"),
      el("button", { onclick: () => d.close() }, "Close"),
    ),
  );
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

// ---------------------------------------------------------------- open and resume

$("landing-new").addEventListener("click", () => setupScreen());
$("landing-open").addEventListener("click", () => $<HTMLInputElement>("file-open").click());
$("file-open").addEventListener("change", async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = "";
  if (!f) return;
  try {
    openSaved(JSON.parse(await f.text()) as SavedTraveller);
  } catch (err) {
    alert(`That file could not be opened: ${String(err)}`);
  }
});
$("landing-resume").addEventListener("click", () => {
  const s = recall<SavedTraveller>(STORE);
  if (s) openSaved(s);
});
function openSaved(s: SavedTraveller): void {
  session = Session.load(s);
  startCreation(false, s.transcript);
}

// ---------------------------------------------------------------- quick NPC

let npc: Traveller | undefined;
function rollNpc(settings: Settings, species: string, seed = newSeed()): Promise<Traveller> {
  return makeNpc(settings, species, seed);
}

$("landing-npc").addEventListener("click", () => npcScreen());
function npcScreen(): void {
  mode = "npc";
  show("work");
  session = undefined;
  const s: Settings = { ...DEFAULT_SETTINGS, ...(recall<Partial<Settings>>(SETTINGS_STORE) ?? {}) };
  clear(left);
  const setting = el("select", {}, el("option", { value: "core", selected: s.setting === "core" }, "Third Imperium"), el("option", { value: "glorious-empire", selected: s.setting === "glorious-empire" }, "Glorious Empire"));
  const species = el("select", {});
  const fill = () => {
    clear(species);
    species.append(el("option", { value: "*" }, "Any"));
    for (const sp of SPECIES.filter((x) => x.settings.includes(setting.value as Settings["setting"]))) species.append(el("option", { value: sp.id }, sp.name));
  };
  setting.addEventListener("change", fill);
  fill();
  const hist = el("div");
  const go = async () => {
    const st = { ...s, setting: setting.value as Settings["setting"] };
    const pool = SPECIES.filter((x) => x.settings.includes(st.setting));
    const sp = species.value === "*" ? pool[Math.floor(Math.random() * pool.length)]!.id : species.value;
    npc = await rollNpc(st, sp);
    renderSheet(sheet, npc, { editable: true });
    clear(hist);
    hist.append(el("h2", { class: "section" }, "How they got here"), historyList(npc));
    bar();
  };
  left.append(
    el("h2", { class: "section" }, "Quick NPC"),
    el("div", { class: "setup" }, el("label", {}, "Setting"), setting, el("label", {}, "Species"), species),
    el("div", { class: "begin" }, el("button", { class: "primary", onclick: go }, "Roll another"), el("button", { onclick: () => npc && exportDialog(npc) }, "Export")),
    hist,
  );
  bar();
  void go();
}

// ---------------------------------------------------------------- a crowd

let crowd: Traveller[] = [];
$("landing-batch").addEventListener("click", () => crowdScreen());
function crowdScreen(): void {
  mode = "crowd";
  show("work");
  session = undefined;
  clear(left);
  clear(sheet);
  const count = el("input", { type: "number", min: 1, max: 200, value: "12", style: "width:80px" });
  const setting = el("select", {}, el("option", { value: "core" }, "Third Imperium"), el("option", { value: "glorious-empire" }, "Glorious Empire"));
  const table = el("div");
  const draw = () => {
    clear(table);
    table.append(
      el(
        "table",
        { class: "t crowd" },
        el("thead", {}, el("tr", {}, el("th", {}, "Name"), el("th", {}, "UPP"), el("th", { class: "n" }, "Age"), el("th", {}, "Careers"))),
        el(
          "tbody",
          {},
          crowd.map((t) =>
            el(
              "tr",
              { onclick: () => renderSheet(sheet, t, { editable: true }) },
              el("td", {}, t.name, el("div", { class: "faint" }, SPECIES.find((s) => s.id === t.speciesId)?.name ?? "")),
              el("td", { style: "font-family:monospace" }, upp(t)),
              el("td", { class: "n" }, t.age),
              el("td", { class: "muted" }, t.careers.map(careerLine).join("; ")),
            ),
          ),
        ),
      ),
    );
  };
  const go = async () => {
    const n = Math.max(1, Math.min(200, Number(count.value) || 12));
    const st: Settings = { ...DEFAULT_SETTINGS, setting: setting.value as Settings["setting"] };
    crowd = [];
    for (let i = 0; i < n; i++) {
      crowd.push(await rollNpc(st, npcSpecies(st.setting)));
    }
    draw();
    if (crowd[0]) renderSheet(sheet, crowd[0], { editable: true });
  };
  left.append(
    el("h2", { class: "section" }, "A crowd of NPCs"),
    el("div", { class: "setup" }, el("label", {}, "How many"), count, el("label", {}, "Setting"), setting),
    el("div", { class: "begin" }, el("button", { class: "primary", onclick: go }, "Roll them"), el("button", { onclick: exportCrowd }, "Export all")),
    el("p", { class: "muted" }, "Click one to see the sheet."),
    table,
  );
  bar();
  void go();
}
function exportCrowd(): void {
  if (!crowd.length) return;
  const d = el(
    "dialog",
    {},
    el("h3", { style: "margin-top:0" }, `Export ${crowd.length} NPCs`),
    el(
      "div",
      { class: "begin" },
      el("button", { class: "primary", onclick: () => download("npcs.csv", toCsv(crowd), "text/csv") }, "CSV"),
      el("button", { onclick: () => download("npcs.md", crowd.map((t) => toMarkdown(t, false)).join("\n\n---\n\n"), "text/markdown") }, "Markdown"),
      el("button", { onclick: () => download("npcs.txt", crowd.map(toText).join("\n\n")) }, "Text"),
      el("button", { onclick: () => d.close() }, "Close"),
    ),
  );
  d.addEventListener("close", () => d.remove());
  document.body.append(d);
  d.showModal();
}

// ---------------------------------------------------------------- a crew

$("landing-crew").addEventListener("click", () => {
  mode = "crew";
  show("work");
  session = undefined;
  bar();
  renderCrew(left, sheet);
});

// ---------------------------------------------------------------- rules

$("landing-rules").addEventListener("click", () => {
  mode = "rules";
  show("work");
  bar();
  renderRules(left, sheet);
});
