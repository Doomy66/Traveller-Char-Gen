/** Roll one random Traveller and print the history: `npx vite-node scripts/sample.ts [seed] [setting] [species]`. */
import { emptyTraveller, skillSummary, upp } from "../src/engine/character";
import { Ctx, DEFAULT_SETTINGS, randomAnswerer } from "../src/engine/context";
import { createTraveller } from "../src/engine/creation";
import { seededRandom } from "../src/engine/dice";

const seed = Number(process.argv[2] ?? 7);
const setting = (process.argv[3] ?? "core") as "core" | "glorious-empire";
const t = { ...emptyTraveller(), name: `Sample ${seed}`, speciesId: process.argv[4] ?? "human", gender: "female" as const };
const ctx = new Ctx(t, { ...DEFAULT_SETTINGS, setting }, randomAnswerer(seededRandom(seed + 1)), seededRandom(seed));
await createTraveller(ctx);
for (const h of t.history) console.log(`[${h.term}|${h.age}] ${h.text}`);
console.log("\nUPP", upp(t), "age", t.age, "cash", t.cash, "debt", t.debt, "shares", t.shipShares, "pension", t.pension);
console.log("Skills:", skillSummary(t));
console.log("Careers:", t.careers.map((c) => `${c.careerId}/${c.assignmentId} ${c.terms}t r${c.officer ? "O" : ""}${c.rank} (${c.endReason})`).join("; "));
console.log("Associates:", t.associates.map((a) => a.kind).join(", "));
console.log("Possessions:", t.possessions.map((p) => p.name).join(", "), "Ships:", t.ships.map((s) => `${s.name} ${s.paidPercent}%`).join(", "));
