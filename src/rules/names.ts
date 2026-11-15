/**
 * Names for NPCs. Built from syllables of our own, roughly Galanglic, Vilani,
 * Aslan and Vargr in sound; none come from the books.
 */
const GIVEN = ["Ana", "Bel", "Cor", "Dav", "El", "Fen", "Gar", "Hal", "Ira", "Jor", "Kat", "Lio", "Mar", "Nia", "Ori", "Pet", "Quin", "Ros", "Sam", "Tor", "Una", "Val", "Wen", "Yas", "Zan"];
const GIVEN_END = ["a", "en", "ik", "ia", "on", "us", "el", "ys", "an", "o", "e", "ira", "ett", "in"];
const FAMILY = ["Ash", "Brann", "Calder", "Drey", "Elm", "Forr", "Gale", "Hart", "Isk", "Jarr", "Kell", "Lorne", "Marr", "Nash", "Orl", "Pike", "Quill", "Rook", "Stave", "Thorn", "Vance", "Wyld", "Yeld"];
const FAMILY_END = ["", "er", "ley", "ton", "wick", "s", "ford", "ham", "an", "ow"];
const VILANI = ["Ka", "Shu", "Ig", "Lii", "Ma", "Kir", "Gu", "Ar", "Ish", "Sa", "Ne", "Dur"];
const ASLAN = ["Ah", "Kho", "Eah", "Hwo", "Ftah", "Yeh", "Sti", "Uiy", "Ao", "Koi", "Hei", "Ryu"];
const VARGR = ["Gvo", "Kna", "Rrou", "Ksu", "Dza", "Ngo", "Fae", "Llo", "Uth", "Ghae", "Rzu", "Aek"];

const pick = <T>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]!;

export function randomName(random: () => number, species: string): string {
  if (species.includes("aslan")) return `${pick(random, ASLAN)}${pick(random, ASLAN).toLowerCase()}${pick(random, ["", "'", "ea", "iy"])}${pick(random, ASLAN).toLowerCase()}`;
  if (species === "vargr") return `${pick(random, VARGR)}${pick(random, VARGR).toLowerCase()}${pick(random, ["", "z", "gh", "r"])}`;
  if (random() < 0.2) return `${pick(random, VILANI)}${pick(random, VILANI).toLowerCase()}${pick(random, VILANI).toLowerCase()} ${pick(random, VILANI)}${pick(random, VILANI).toLowerCase()}`;
  return `${pick(random, GIVEN)}${pick(random, GIVEN_END)} ${pick(random, FAMILY)}${pick(random, FAMILY_END)}`;
}
