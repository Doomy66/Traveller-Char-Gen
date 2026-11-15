import type { BookId } from "../types";

/** A Mustering Out benefit found only in Glorious Empire space, in our own words. */
export interface GeUniqueBenefit {
  name: string;
  text: string;
}

export interface GeRules {
  /** Characteristic modifiers for human Travellers (slaves), applied when rolled. */
  humanSlaveModifiers: { END: number; EDU: number };
  /** SOC of every human slave. */
  slaveSoc: number;
  /** Humans take the Cash column only once when mustering out of any career but Slave. */
  humanCashOnce: boolean;
  /** After a failed qualification, one more attempt at another career at this DM. */
  qualifyFailRetryDM: number;
  /** If that second attempt fails, the Traveller must enter one of these (or Outlaw, not in this app). */
  qualifyFailFallback: string[];
  /** SOC after the fallback above. */
  qualifyFailSoc: number;
  /** A Tolerance result on a skill table is rerolled once; only a second Tolerance counts. */
  toleranceRerollOnce: boolean;
  /** An event that grants Tolerance may grant this skill instead. */
  toleranceAltSkill: string;
  ancestralDeedsNote: string;
  availableCoreAslanCareersNote: string;
  /** Other notes from the chapter introduction, in our own words. */
  notes: string[];
  uniqueBenefits: GeUniqueBenefit[];
  source: { book: BookId; page: number };
}

/** General Traveller creation rules for the Glorious Empire, GE pp56-59. */
export const GE_RULES: GeRules = {
  humanSlaveModifiers: { END: 1, EDU: -2 },
  slaveSoc: 0,
  humanCashOnce: true,
  qualifyFailRetryDM: -1,
  qualifyFailFallback: ["ge-landless-one"],
  qualifyFailSoc: 0,
  toleranceRerollOnce: true,
  toleranceAltSkill: "Diplomat",
  ancestralDeedsNote:
    "All Empire Aslan are Tokouea'we clan, which gives no Ancestral Deeds DM; instead males with STR 10+ and females with INT 8+ get DM+1. A 7 means the ekho was among the Empire's most influential and still gives DM+3 on Ancestral Territory.",
  availableCoreAslanCareersNote:
    "Ceremonial, Envoy (spy, duellist), Management (corporate, clan aide), Scientist (healer, researcher) and Outlaw are used as normal. Envoy (negotiator), Management (governess), Scientist (explorer), Wanderer and Outcast are rare or absent. Warrior, Warrior Officer, Fleet and Fleet Officer replace Military, Military Officer, Spacer and Space Officer.",
  notes: [
    "A freed human slave's SOC may rise to 1 or 2 if they served two or more terms in a military career.",
    "A human slave's rank in an Aslan career counts only among slaves; they never outrank an Aslan in that career.",
    "Human slaves allowed into Aslan careers use the Slave career's labourer/servant/technician Events for non-combat careers and its Dog Soldier Events for military ones.",
    "Military Travellers may take a Combat Implant (an augmentation) as a Benefit.",
    "Empire Aslan seldom learn languages other than Trokh without a particular reason.",
    "Aslan with SOC or TER 3+ may own human slaves (see GE p37).",
  ],
  uniqueBenefits: [
    {
      name: "Brotherhood of the Empire",
      text: "Ceremonial order granting free travel in the Empire: D3 Allies among the career's officers and one Middle Passage a month.",
    },
    {
      name: "Courier",
      text: "Your ahriy entrusts you with an old Wahtoi courier; you must carry imperial mail, and it has three rolled Spacecraft Quirks.",
    },
    {
      name: "Transport",
      text: "Your ahriy lets you use a military transport (armed trader or mercenary cruiser) for mercenary work, subject to recall.",
    },
    {
      name: "External or Aslan Ally",
      text: "Slaves only: an Ally from the Hierate or Outrim Void, or an important Aslan inside the Empire.",
    },
    {
      name: "Freedom",
      text: "Slaves only: you are freed as an awkhea (landless serf), become SOC 2, and continue in a Core Rulebook career.",
    },
    {
      name: "Augmentation",
      text: "An augmentation chosen from the Central Supply Catalogue or the Aslan augmentations of The Trojan Reach.",
    },
  ],
  source: { book: "GE", page: 57 },
};
