import { emptyTraveller, type Traveller } from "./character";
import { Ctx, randomAnswerer, type Answerer, type Settings } from "./context";
import { createTraveller } from "./creation";
import { seededRandom } from "./dice";
import { randomName } from "../rules/names";
import { SPECIES } from "../rules/species";

/**
 * Roll an NPC to the end with the choices made for them. The seed fixes
 * everything: the dice, the name and every answer. `answerer` swaps the
 * default (take the engine's hint, else at random) for one with a purpose,
 * such as learning a crew position's skill. CharSpec 1.2, 12.
 */
/** A species for a crowd or crew: mostly human (or Aslan in the Empire), with the odd other. */
export function npcSpecies(setting: Settings["setting"], random: () => number = Math.random): string {
  if (setting === "glorious-empire") return random() < 0.7 ? "ge-aslan" : "ge-human-slave";
  const others = SPECIES.filter((x) => x.settings.includes("core") && x.id !== "human");
  return random() < 0.85 || others.length === 0 ? "human" : others[Math.floor(random() * others.length)]!.id;
}

export async function makeNpc(settings: Settings, species: string, seed: number, answerer?: (t: Traveller, random: () => number) => Answerer): Promise<Traveller> {
  const random = seededRandom(seed);
  const t: Traveller = { ...emptyTraveller(), speciesId: species, gender: random() < 0.5 ? "female" : "male", name: randomName(random, species) };
  const answerRandom = seededRandom(seed ^ 0x5bd1e995);
  const ctx = new Ctx(t, { ...settings, manualDice: false }, answerer ? answerer(t, answerRandom) : randomAnswerer(answerRandom), random);
  await createTraveller(ctx);
  return t;
}
