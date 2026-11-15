import { findCareer, hasCareer } from "../rules/careers/index";
import { findSpecies } from "../rules/species";
import { characteristicDM, NOBLE_TITLES } from "../rules/tables";
import type { Stat } from "../rules/types";
import { skillList, upp, type CareerRecord, type Traveller } from "./character";
import { rankTitle } from "./effects";

/**
 * The finished Traveller as text: the sheet in a form to paste into notes,
 * a forum or a VTT, and as Markdown. CharSpec 9.
 */

const fmt = (n: number) => `Cr${Math.round(n).toLocaleString("en-GB")}`;
const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

export function careerLine(r: CareerRecord): string {
  if (!hasCareer(r.careerId)) return r.careerId;
  const c = findCareer(r.careerId);
  const asg = r.assignments.map((id) => c.assignments.find((a) => a.id === id)?.name ?? id).join(", ");
  const title = rankTitle(c, r);
  const rank = `${r.officer ? "O" : ""}${r.rank}`;
  return `${c.name} (${asg}), ${r.terms} term${r.terms === 1 ? "" : "s"}, rank ${rank}${title ? ` ${title}` : ""}`;
}

export function nobleTitle(t: Traveller): string | undefined {
  const soc = t.stats.SOC ?? 0;
  if (soc < 11 || t.speciesId.includes("aslan")) return undefined;
  return NOBLE_TITLES[Math.min(15, soc)];
}

export function statLine(t: Traveller): string {
  const order: Stat[] = ["STR", "DEX", "END", "INT", "EDU", "SOC", "PSI", "TER"];
  return order
    .filter((s) => t.stats[s] !== undefined)
    .map((s) => `${s} ${t.stats[s]} (${sign(characteristicDM(t.stats[s]!))})`)
    .join("  ");
}

export function toText(t: Traveller): string {
  const sp = findSpecies(t.speciesId);
  const lines: string[] = [];
  const title = nobleTitle(t);
  lines.push(`${title ? `${title} ` : ""}${t.name || "Unnamed Traveller"}   ${upp(t)}   Age ${t.age}`);
  lines.push(`${sp.name}${t.gender !== "other" ? `, ${t.gender}` : ""}${t.homeworld ? `, from ${t.homeworld}` : ""}`);
  lines.push(statLine(t));
  if (t.rite !== undefined) lines.push(`Rite of passage ${t.rite}`);
  lines.push("");
  lines.push(`Careers: ${t.careers.map(careerLine).join("; ") || "none"}`);
  lines.push(`Skills: ${skillList(t).map((s) => `${s.name} ${s.level}`).join(", ") || "none"}`);
  if (t.traits.length) lines.push(`Traits: ${t.traits.join("; ")}`);
  lines.push("");
  const money = [`Cash ${fmt(t.cash)}`];
  if (t.debt) money.push(`Debt ${fmt(t.debt)}`);
  if (t.pension) money.push(`Pension ${fmt(t.pension)}/year`);
  if (t.shipShares) money.push(`${t.shipShares} Ship Share${t.shipShares === 1 ? "" : "s"}`);
  if (t.clanShares) money.push(`${t.clanShares} Clan Share${t.clanShares === 1 ? "" : "s"}`);
  if (t.tasMember) money.push("TAS member");
  lines.push(money.join(", "));
  if (t.ships.length) lines.push(`Ships: ${t.ships.map((s) => `${s.name} (${s.paidPercent}% paid${s.quirks.length ? `; quirks: ${s.quirks.join("; ")}` : ""})`).join("; ")}`);
  if (t.possessions.length) lines.push(`Equipment: ${t.possessions.map((p) => p.name).join(", ")}`);
  const by = (k: string) => t.associates.filter((a) => a.kind === k);
  const assoc = (["ally", "contact", "rival", "enemy"] as const)
    .map((k) => {
      const list = by(k);
      if (!list.length) return "";
      const word = { ally: "Allies", contact: "Contacts", rival: "Rivals", enemy: "Enemies" }[k];
      return `${word}: ${list.map((a) => a.note || a.origin).join("; ")}`;
    })
    .filter(Boolean);
  if (assoc.length) lines.push(...assoc);
  if (t.wounds.length) lines.push(`Wounds: ${t.wounds.join(", ")}`);
  if (t.goal) lines.push(`Why travelling: ${t.goal}`);
  if (t.notes) lines.push(`Notes: ${t.notes}`);
  return lines.join("\n");
}

export function toMarkdown(t: Traveller, withHistory = true): string {
  const sp = findSpecies(t.speciesId);
  const out: string[] = [];
  const title = nobleTitle(t);
  out.push(`# ${title ? `${title} ` : ""}${t.name || "Unnamed Traveller"}`);
  out.push("");
  out.push(`**${sp.name}**${t.gender !== "other" ? `, ${t.gender}` : ""}, age ${t.age}${t.homeworld ? `, from ${t.homeworld}` : ""}. UPP **${upp(t)}**.`);
  out.push("");
  const stats = (["STR", "DEX", "END", "INT", "EDU", "SOC", "PSI", "TER"] as Stat[]).filter((s) => t.stats[s] !== undefined);
  out.push(`| ${stats.join(" | ")} |`);
  out.push(`| ${stats.map(() => "---").join(" | ")} |`);
  out.push(`| ${stats.map((s) => `${t.stats[s]} (${sign(characteristicDM(t.stats[s]!))})`).join(" | ")} |`);
  out.push("");
  out.push("## Careers");
  for (const r of t.careers) out.push(`- ${careerLine(r)}${r.endReason ? ` (${r.endReason})` : ""}`);
  out.push("");
  out.push("## Skills");
  out.push(skillList(t).map((s) => `${s.name} ${s.level}`).join(", ") || "None");
  out.push("");
  out.push("## Finances and gear");
  out.push(toText(t).split("\n").filter((l) => /^(Cash|Ships|Equipment)/.test(l)).map((l) => `- ${l}`).join("\n"));
  out.push("");
  if (t.associates.length) {
    out.push("## People");
    for (const a of t.associates) out.push(`- **${a.kind}**: ${a.note || "unnamed"} (${a.origin})`);
    out.push("");
  }
  if (t.traits.length) {
    out.push("## Traits");
    for (const tr of t.traits) out.push(`- ${tr}`);
    out.push("");
  }
  if (withHistory) {
    out.push("## History");
    for (const h of t.history) if (h.kind !== "roll") out.push(`- ${h.age}: ${h.text}`);
  }
  return out.join("\n");
}

/** One CSV row per Traveller, for a crowd of NPCs. */
export function toCsv(list: Traveller[], lead?: { headers: string[]; cells: (t: Traveller, i: number) => string[] }): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const rows = [[...(lead?.headers ?? []), "Name", "Species", "Age", "UPP", "Careers", "Skills", "Cash", "Ship Shares"].join(",")];
  list.forEach((t, i) => {
    rows.push(
      [...(lead?.cells(t, i) ?? []), t.name, findSpecies(t.speciesId).name, String(t.age), upp(t), t.careers.map(careerLine).join("; "), skillList(t).map((s) => `${s.name} ${s.level}`).join(", "), String(t.cash), String(t.shipShares)]
        .map(esc)
        .join(","),
    );
  });
  return rows.join("\n");
}
