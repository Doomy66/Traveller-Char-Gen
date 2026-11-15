/**
 * Random numbers. A small seeded generator so a Traveller can be rolled again
 * from the same seed, and tests can pin every die.
 */

/** mulberry32: fast, small and good enough for dice. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/** How many six-sided dice an expression rolls, and how it is read. */
export type DiceSpec = "1D" | "2D" | "3D" | "D3";

export function diceCount(spec: DiceSpec): number {
  return spec === "2D" ? 2 : spec === "3D" ? 3 : 1;
}

/** Total of a set of dice for a spec. D3 is a d6 halved, rounded up. */
export function diceTotal(spec: DiceSpec, dice: number[]): number {
  const sum = dice.reduce((a, b) => a + b, 0);
  return spec === "D3" ? Math.ceil(sum / 2) : sum;
}
