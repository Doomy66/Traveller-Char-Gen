import { DEFAULT_SETTINGS } from "../src/engine/context";
import { makeNpc } from "../src/engine/npc";
import { crewAnswerer, crewLevel } from "../src/engine/crew";
import { CREW_POSITIONS } from "../src/rules/crew";

/** How often one steered NPC reaches each post's level. `npx vite-node scripts/crew-stats.ts [n] [setting]` */
const n = Number(process.argv[2] ?? 100);
const setting = (process.argv[3] ?? "core") as "core" | "glorious-empire";
const species = setting === "core" ? "human" : "ge-aslan";
for (const p of CREW_POSITIONS) {
  const hits = [0, 0, 0, 0];
  let terms = 0;
  for (let s = 1; s <= n; s++) {
    const t = await makeNpc({ ...DEFAULT_SETTINGS, setting }, species, s * 7919, (tt, r) => crewAnswerer(tt, r, p, Number(process.argv[4] ?? 1)));
    const lv = crewLevel(t, p);
    for (let k = 0; k <= 3; k++) if (lv >= k) hits[k]!++;
    terms += t.terms;
  }
  console.log(p.name.padEnd(18), hits.map((h, k) => `${k}+:${String(Math.round((100 * h) / n)).padStart(3)}%`).join("  "), ` avg terms ${(terms / n).toFixed(1)}`);
}
