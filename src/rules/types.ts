/**
 * The shape of the rules data.
 *
 * Every table in the books is transcribed once, as data, under `src/rules/`,
 * and the engine reads those tables rather than restating them. The data uses
 * a few small text grammars (a skill gain, a check, a benefit) because that is
 * how the books write their tables and it keeps the transcription close to the
 * page. `src/engine/grammar.ts` parses them, and a test parses every entry in
 * every table so a typo fails the build rather than a game. See CharSpec.md 3.
 *
 * Text fields (`text`, `description`) are short summaries in our own words, not
 * the book's prose. Mongoose's text stays in Mongoose's books.
 */

/** The characteristics. PSI only exists once tested; TER is the Aslan territory score. */
export type Stat = "STR" | "DEX" | "END" | "INT" | "EDU" | "SOC" | "PSI" | "TER";

export const PHYSICAL: readonly Stat[] = ["STR", "DEX", "END"];
export const MENTAL: readonly Stat[] = ["INT", "EDU", "SOC"];
export const CORE_STATS: readonly Stat[] = ["STR", "DEX", "END", "INT", "EDU", "SOC"];

/** Where a rule comes from. Page is the printed page number in that book. */
export interface Source {
  book: BookId;
  page: number;
}

/**
 * The books this application reads.
 * CRB: Traveller Core Rulebook Update 2022.
 * GE: Glorious Empire (Aslan of the Trojan Reach), Mongoose 2e.
 * CSC: Central Supply Catalogue Update 2023.
 */
export type BookId = "CRB" | "GE" | "CSC";

export const BOOK_NAMES: Record<BookId, string> = {
  CRB: "Traveller Core Rulebook (Update 2022)",
  GE: "Glorious Empire",
  CSC: "Central Supply Catalogue (Update 2023)",
};

/**
 * A skill gain, as the books write them in skill tables, rank bonuses and
 * events. Parsed by `parseGain` (CharSpec 3.2):
 *
 *   "Gun Combat"            +1 level (a speciality is chosen when one is needed)
 *   "Electronics (comms)"   +1 level in that speciality
 *   "Athletics (any)"       +1 level, any speciality
 *   "Streetwise 1"          set to level 1 if that is higher than now
 *   "Science (psionicology) 1"
 *   "Gambler 0"             level 0
 *   "DEX +1", "SOC -1"      characteristic change
 *   "Drive 1 or Flyer 1"    a choice of one; "A, B or C" too
 *   "Deception, Persuade and Stealth"   all of them; "A and B" too
 *   "Melee (natural or blade)"          a choice of speciality
 *   "2 Ship Shares", "Ship Share", "3 Clan Shares", "Cr5000"
 *   "Any Talent", "Any Talent skill 1"  a psionic talent of the player's choice
 *   "Any skill", "Any skill 1"          any skill except Jack-of-all-Trades
 *   "Independence [male] or Admin [female,slave]"   options limited by who the Traveller is
 *   "--" or ""              nothing
 */
export type GainText = string;

/**
 * A check, as the books write them. Parsed by `parseCheck` (CharSpec 3.3):
 *
 *   "INT 6+"                      2D + INT DM
 *   "DEX or INT 5+"               the better of the two
 *   "Advocate 8+"                 2D + skill level (DM-3 untrained)
 *   "Investigate 8+ or Streetwise 8+"
 *   "Melee (unarmed) 8+"
 *   "8+"                          plain 2D
 *   "Rite 8+"                     Aslan rite of passage score (Glorious Empire)
 *
 * During Traveller creation only the listed characteristic or skill applies
 * (CRB p11), never both.
 */
export type CheckText = string;

/**
 * A benefit, as a career's Other Benefits column writes it. Parsed by
 * `parseBenefit` (CharSpec 3.4). Known names: Scientific Equipment, Ship Share,
 * N Ship Shares, Weapon, Gun, Blade, Armour, Cybernetic Implant, Combat Implant,
 * Augmentation, TAS Membership, Contact, Ally, Personal Vehicle, Free Trader,
 * Lab Ship, Yacht, Scout Ship, Ship's Boat, Clan Share, N Clan Shares,
 * Brotherhood of the Empire, Courier, Transport, External or Aslan Ally,
 * Freedom; plus anything `GainText` accepts ("INT +1", "Deception, Persuade or
 * Stealth"), and "A or B" between any of them.
 */
export type BenefitText = string;

export type AssociateKind = "contact" | "ally" | "rival" | "enemy";

/** A count that may be rolled: 2, "D3", "1D", "2D". */
export type Amount = number | "D3" | "1D" | "2D";

/**
 * What an event, mishap or other table entry does. The engine applies these in
 * order. `text` on the table entry says what happened in words; these say what
 * it does in numbers. CharSpec 3.5 defines each.
 */
export type Effect =
  /** Gain a skill, characteristic or share, in GainText grammar. */
  | { t: "gain"; what: GainText }
  /** Gain any skill of the player's choice. With `level`, it is set to that level; without, +1. */
  | { t: "anySkill"; level?: number; except?: string[] }
  /** Increase by one level any skill the Traveller already has (level 0 or more). */
  | { t: "improveExisting" }
  /** The player picks one option. */
  | { t: "choose"; prompt?: string; options: { label: string; effects: Effect[] }[] }
  /** The player decides yes or no. */
  | { t: "optional"; prompt: string; yes: Effect[]; no?: Effect[] }
  /**
   * Roll a check. `on2` replaces `fail` on a natural 2; `high` replaces `pass`
   * when the total reaches `highTarget`.
   */
  | {
      t: "check";
      check: CheckText;
      dm?: number;
      pass?: Effect[];
      fail?: Effect[];
      on2?: Effect[];
      highTarget?: number;
      high?: Effect[];
    }
  /** Roll dice and apply the matching row. Ranges are inclusive. */
  | { t: "roll"; dice: "1D" | "2D" | "D3"; dm?: number; results: { min: number; max: number; text?: string; effects: Effect[] }[] }
  /** Gain associates. */
  | { t: "associate"; kind: AssociateKind; count?: Amount; note?: string }
  /**
   * Turn one existing associate of a `from` kind into one of the `to` kinds
   * (the player picks). If there is none, apply `otherwise`.
   */
  | { t: "convert"; from: AssociateKind[]; to: AssociateKind[]; otherwise?: Effect[] }
  /** DM to any one Benefit roll from this career (positive) or to all of them (`all`). */
  | { t: "benefitDM"; dm: number; all?: boolean }
  /** Gain (n > 0) or lose (n < 0) Benefit rolls from this career; "term" loses this term's, "career" loses all. */
  | { t: "benefitRolls"; n: number | "term" | "career" }
  /** After a mishap: the Traveller keeps this term's Benefit roll. */
  | { t: "keepBenefit" }
  /** DM to the next advancement roll (and so to a commission roll taken instead). */
  | { t: "advanceDM"; dm: number }
  /** DM to the next qualification roll, optionally only for a named career. */
  | { t: "qualifyDM"; dm: number; career?: string }
  /** DM to survival rolls: the next one, or every one for the rest of this career. */
  | { t: "survivalDM"; dm: number; scope: "next" | "career" }
  /** Automatic promotion this term (no advancement roll needed). */
  | { t: "promote" }
  /** Automatic commission (military careers) or, if already an officer, promotion. */
  | { t: "promoteOrCommission" }
  /** Change rank by `delta` (demotion is negative). */
  | { t: "rank"; delta: number }
  /** Roll on this career's Mishap table. `eject: false` means the Traveller stays in the career. */
  | { t: "mishap"; eject?: boolean }
  /**
   * Roll on the Injury table: normally, worst of two, or a fixed result (1 to 6).
   * "severe" is the common Mishap 1: result 2, or the worse of two rolls, at the player's choice.
   */
  | { t: "injury"; mode?: "roll" | "worst2" | "fixed" | "severe"; result?: number }
  /** Roll on the Life Events table. */
  | { t: "lifeEvent" }
  /** Roll on another career's Events or Mishap table (the player picks the career). */
  | { t: "otherTable"; careers: string[]; table: "events" | "mishaps"; thenSkillRoll?: boolean }
  /** The Traveller leaves this career at the end of the term. */
  | { t: "leave" }
  /** After a mishap: the Traveller is not ejected. */
  | { t: "stay" }
  /** The Traveller must continue in this career next term. */
  | { t: "mustContinue" }
  /** The Traveller's next term is forced: Prisoner, Drifter, the Draft, or a named career. */
  | { t: "nextTerm"; career: string; assignment?: string }
  /** The player chooses between fleeing to the Drifter career or being drafted next term. */
  | { t: "draftOrDrifter"; canAvoid?: CheckText }
  /** The Traveller may test PSI and may enter the Psion career in a later term. */
  | { t: "psionicTest" }
  /** Gain or lose credits (negative is a debt). */
  | { t: "cash"; amount: number; dice?: Amount }
  /** Prisoner Parole Threshold change: a number, "1D" (reduce by 1D when negative), or "reroll". */
  | { t: "parole"; delta: number | "-1D" | "reroll" }
  /** Pre-career education: the Traveller does not graduate this term. */
  | { t: "noGraduate" }
  /** An effect with no mechanical consequence, recorded in the history. */
  | { t: "note"; text: string }
  /**
   * Something only one table does, handled by name in the engine. Each key is
   * listed in CharSpec 3.5.30 and in `SPECIALS` in src/engine/effects.ts.
   */
  | { t: "special"; key: string; args?: Record<string, unknown> };

/** One row of an Events (2D) or Mishaps (1D) table. */
export interface TableRow {
  roll: number;
  text: string;
  effects: Effect[];
}

/** A six-row skill table, rows 1 to 6, each a GainText. */
export type SkillRow = [GainText, GainText, GainText, GainText, GainText, GainText];

export interface SkillTableDef {
  id: string;
  name: string;
  kind: "personal" | "service" | "advanced" | "officer" | "other";
  rows: SkillRow;
  requires?: {
    minEdu?: number;
    commissioned?: boolean;
    gender?: "male" | "female";
    minRank?: number;
  };
}

export interface Assignment {
  id: string;
  name: string;
  description: string;
  survival: CheckText;
  advancement: CheckText;
  /** The assignment's own (specialist) skill table. */
  skills: SkillRow;
  /** Glorious Empire: who may take this assignment. */
  gender?: "male" | "female";
  species?: string[];
  /** Qualification for this assignment when it differs from the career's (Glorious Empire). */
  qualification?: CheckText;
}

export interface Rank {
  title?: string;
  bonus?: GainText;
}

export interface RankTable {
  /** Assignment ids this table applies to, or "all". */
  assignments: string[] | "all";
  officer?: boolean;
  /** Ranks 0 to 6. */
  ranks: Rank[];
}

export interface Qualification {
  /** null means automatic. */
  check: CheckText | null;
  perPreviousCareer?: number;
  /** DM when aged at least `age`. */
  age?: { age: number; dm: number };
  /** Qualify automatically when this characteristic is at least `min`. */
  automaticIf?: { stat: Stat; min: number };
  /** The career cannot be chosen freely (Prisoner, Psion before testing, Slave). */
  restricted?: "prisoner" | "psion" | "slave";
}

export interface Career {
  id: string;
  name: string;
  source: Source;
  description: string;
  /** Which rules set this belongs to; a setting filters careers by it. */
  setting: "core" | "glorious-empire";
  qualification: Qualification;
  /** Military careers: the commission roll. */
  commission?: CheckText;
  assignments: Assignment[];
  tables: SkillTableDef[];
  ranks: RankTable[];
  benefits: {
    /** Cash column, rows 1 to 7 (or more). */
    cash: number[];
    /** Other Benefits column, rows 1 to 7 (or more). */
    other: BenefitText[];
    /** Career-specific DMs to every Benefit roll (Glorious Empire). */
    dms?: { if: "SOC9" | "male" | "female" | "mercenary" | "rank5"; dm: number }[];
  };
  mishaps: TableRow[];
  events: TableRow[];
  /** Basic training: the Service Skills table (most careers) or the assignment's table (Citizen, Drifter, Psion). */
  basicTraining: "service" | "assignment";
  /** How a change of assignment works (CRB p20). */
  assignmentChange: "reroll" | "newCareer" | "free";
  /** Medical Bills row (CRB p49). */
  medical: "military" | "civil" | "none";
  /** Whether five or more terms earn a pension (CRB p48). */
  pension: boolean;
  /** Military careers that may draft and give commissions. */
  military?: boolean;
  /** Notes worth showing the player, in our own words. */
  notes?: string[];
}

/** A species a Traveller may be. */
export interface Species {
  id: string;
  name: string;
  source: Source;
  description: string;
  /** Characteristic modifiers applied as soon as the characteristics are rolled. */
  modifiers: Partial<Record<Stat, number>>;
  traits: { name: string; text: string }[];
  /** Maximum of each characteristic for this species; default 15. */
  max?: Partial<Record<Stat, number>>;
  /** Settings this species belongs to. */
  settings: ("core" | "glorious-empire")[];
  /** Extra characteristics this species rolls (Aslan TER). */
  extraStats?: Stat[];
  /** Natural weapon, for the sheet. */
  natural?: { name: string; damage: string };
}
