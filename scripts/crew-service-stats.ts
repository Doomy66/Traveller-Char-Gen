import { DEFAULT_SETTINGS } from "../src/engine/context";
import { rollCrewMember } from "../src/engine/crew";
import { CREW_POSITIONS, findService, serviceNeed } from "../src/rules/crew";
import { seededRandom } from "../src/engine/dice";

/** How many NPCs it takes to fill each post in a service. `npx vite-node scripts/crew-service-stats.ts navy [min] [n]` */
const service = findService(process.argv[2] ?? "navy")!;
const min = Number(process.argv[3] ?? 1);
const n = Number(process.argv[4] ?? 10);
const species = service.setting === "core" ? "human" : "ge-aslan";
for (const p of CREW_POSITIONS) {
  let met = 0;
  let tries = 0;
  for (let k = 0; k < n; k++) {
    const r = seededRandom(k * 31 + p.id.length);
    const m = await rollCrewMember(p, min, { ...DEFAULT_SETTINGS, setting: service.setting }, species, () => Math.floor(r() * 2 ** 32), 40, serviceNeed(service, p));
    if (m.met) met++;
    tries += m.tries;
  }
  console.log(p.name.padEnd(18), `filled ${met}/${n}`, ` avg NPCs ${(tries / n).toFixed(1)}`);
}
