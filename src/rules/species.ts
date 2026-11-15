import type { Species } from "./types";

/** Species, CRB pp52-54 and Glorious Empire p57. Trait text is ours. */
export const SPECIES: Species[] = [
  {
    id: "human",
    name: "Human",
    source: { book: "CRB", page: 8 },
    description: "Humaniti, in all its variety across Charted Space.",
    modifiers: {},
    traits: [],
    settings: ["core"],
  },
  {
    id: "aslan",
    name: "Aslan",
    source: { book: "CRB", page: 53 },
    description: "Proud, clannish predators of pouncer stock, raised here among humans in the Imperium.",
    modifiers: { STR: 2, DEX: -2 },
    traits: [
      { name: "Dewclaw", text: "A retractable claw: Melee (natural), 1D+2 damage." },
      { name: "Heightened Senses", text: "DM+1 to Recon and Survival checks." },
    ],
    natural: { name: "Dewclaw", damage: "1D+2" },
    settings: ["core"],
  },
  {
    id: "vargr",
    name: "Vargr",
    source: { book: "CRB", page: 54 },
    description: "Uplifted canines, charismatic and restless, raised here among humans in the Imperium.",
    modifiers: { STR: -2, DEX: 1, END: -1 },
    traits: [
      { name: "Bite", text: "Sharp canines: Melee (natural), 1D+1 damage." },
      { name: "Heightened Senses", text: "DM+1 to Recon and Survival checks; DM-1 to sight-based checks in the dark." },
    ],
    natural: { name: "Bite", damage: "1D+1" },
    settings: ["core"],
  },
  {
    id: "ge-aslan",
    name: "Aslan (Glorious Empire)",
    source: { book: "GE", page: 56 },
    description:
      "An Aslan of the Tokouea'we clan of the Glorious Empire. Uses the Core Aslan modifiers; Aliens of Charted Space Vol. 1 has the full Aslan creation rules.",
    modifiers: { STR: 2, DEX: -2 },
    traits: [
      { name: "Dewclaw", text: "A retractable claw: Melee (natural), 1D+2 damage." },
      { name: "Heightened Senses", text: "DM+1 to Recon and Survival checks." },
      { name: "Intolerant", text: "Glorious Empire Aslan rarely accept slights; Tolerance is a weakness in their eyes." },
    ],
    natural: { name: "Dewclaw", damage: "1D+2" },
    settings: ["glorious-empire"],
    extraStats: ["TER"],
  },
  {
    id: "ge-human-slave",
    name: "Human slave (Glorious Empire)",
    source: { book: "GE", page: 57 },
    description: "A human bred or taken into slavery in the Glorious Empire. SOC is 0 while a slave.",
    modifiers: { END: 1, EDU: -2 },
    traits: [{ name: "Slave", text: "SOC 0; takes the Cash column only once outside the Slave career." }],
    settings: ["glorious-empire"],
  },
];

export function findSpecies(id: string): Species {
  const s = SPECIES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown species ${id}`);
  return s;
}
