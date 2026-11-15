import type { Career, Effect } from "../types";

/** Gain 1D Benefit rolls. */
const gain1dBenefitRolls: Effect = {
  t: "roll",
  dice: "1D",
  results: [1, 2, 3, 4, 5, 6].map((n) => ({ min: n, max: n, effects: [{ t: "benefitRolls", n } as Effect] })),
};

/** Landless One, GE pp68-69. Aslan who found no place in Empire society. */
export const geLandlessOne: Career = {
  id: "ge-landless-one",
  name: "Landless One",
  source: { book: "GE", page: 68 },
  description: "Despised Aslan who failed to find a place, filling the Empire's underworld roles.",
  setting: "glorious-empire",
  qualification: { check: null },
  assignments: [
    {
      id: "labourer",
      name: "Labourer",
      description: "Dead-end work, often beside human slaves.",
      survival: "END 6+",
      advancement: "STR 7+",
      skills: ["Athletics", "Drive", "Streetwise", "Gun Combat", "END +1", "STR +1"],
    },
    {
      id: "wildcatter",
      name: "Wildcatter",
      description: "Salvages derelicts and mines asteroids, comets and gas giants.",
      survival: "DEX 7+",
      advancement: "INT 7+",
      skills: ["Mechanic", "Profession (miner or belter)", "Vacc Suit", "Survival", "Astrogation", "Pilot"],
    },
    {
      id: "trader",
      name: "Trader",
      description: "A black marketeer bringing scarce goods into the Empire.",
      survival: "INT 8+",
      advancement: "END 7+",
      skills: ["Broker", "Streetwise", "Admin", "Deception", "Persuade", "Gun Combat"],
    },
    {
      id: "slaver",
      name: "Slaver",
      description: "Raids foreign systems for human slaves.",
      survival: "END 8+",
      advancement: "INT 7+",
      skills: ["Melee", "Stealth", "Deception", "Recon", "Astrogation", "Pilot or Flyer"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "Gun Combat", "Gambler", "Jack-of-All-Trades"] },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Independence [male] or Admin [female]", "Vacc Suit", "Streetwise", "Melee (natural)", "Mechanic", "Survival"],
    },
  ],
  ranks: [
    {
      assignments: ["labourer"],
      ranks: [
        { title: "Awkhea" },
        { bonus: "Independence 1" },
        {},
        { title: "Foreman", bonus: "Streetwise 1" },
        {},
        {},
        {},
      ],
    },
    {
      assignments: ["wildcatter"],
      ranks: [
        { title: "Scavenger" },
        { title: "Finder", bonus: "Profession (miner or belter) 1" },
        {},
        { title: "Surveyor", bonus: "Mechanic 1" },
        {},
        { title: "Seeker", bonus: "Jack-of-All-Trades 1" },
        {},
      ],
    },
    {
      assignments: ["trader"],
      ranks: [
        {},
        { title: "Fence", bonus: "Independence 1 [male] or Admin 1 [female]" },
        {},
        { title: "Operator", bonus: "Broker 1" },
        {},
        { title: "Source", bonus: "INT +1" },
        {},
      ],
    },
    {
      assignments: ["slaver"],
      ranks: [
        { title: "Recruit" },
        { bonus: "Melee 1" },
        { title: "Huntsman" },
        { title: "Sergeant", bonus: "Recon 1" },
        { title: "First Officer" },
        { title: "Captain", bonus: "Deception 1 or Streetwise 1" },
        {},
      ],
    },
  ],
  benefits: {
    cash: [0, 500, 500, 1000, 10000, 30000, 50000],
    other: ["INT +1", "END +1", "Weapon", "Independence or Streetwise", "Contact", "EDU +1", "END +1 and EDU +1"],
    dms: [{ if: "male", dm: 1 }],
  },
  mishaps: [
    { roll: 1, text: "Badly hurt.", effects: [{ t: "injury", mode: "worst2" }] },
    {
      roll: 2,
      text: "Your friends abandon you.",
      effects: [{ t: "special", key: "loseAssociate", args: { kinds: ["ally", "contact"], otherwise: [{ t: "benefitRolls", n: "term" }] } }],
    },
    {
      roll: 3,
      text: "Your ship crashes on a hostile world.",
      effects: [{ t: "gain", what: "Survival 1, Mechanic 1, Animals 1 or Recon 1" }],
    },
    { roll: 4, text: "Disease or starvation nearly kills you.", effects: [{ t: "gain", what: "END -1" }] },
    {
      roll: 5,
      text: "A rival sabotages your ship and you repair it.",
      effects: [{ t: "gain", what: "Mechanic" }, { t: "associate", kind: "rival" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You find a supply cache and sell it on the black market.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "1D Benefit rolls", effects: [gain1dBenefitRolls] },
            { label: "Streetwise 1", effects: [{ t: "gain", what: "Streetwise 1" }] },
            { label: "Broker 1", effects: [{ t: "gain", what: "Broker 1" }] },
          ],
        },
      ],
    },
    { roll: 4, text: "With no help or parts, you learn to make do.", effects: [{ t: "gain", what: "Jack-of-All-Trades" }] },
    {
      roll: 5,
      text: "A job across the border puts you among Hierate Aslan or humans.",
      effects: [
        { t: "gain", what: "Tolerance" },
        {
          t: "choose",
          options: [
            { label: "Persuade 1", effects: [{ t: "gain", what: "Persuade 1" }] },
            { label: "Deception 1", effects: [{ t: "gain", what: "Deception 1" }] },
            { label: "Independence 1", effects: [{ t: "gain", what: "Independence 1" }] },
            { label: "A Contact", effects: [{ t: "associate", kind: "contact" }] },
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "anySkill", except: ["Jack-of-All-Trades"] }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You pick up shipboard skills.",
      effects: [{ t: "gain", what: "Pilot (spacecraft), Gunner (turret), Engineer or Mechanic" }],
    },
    {
      roll: 9,
      text: "You recruit to fill gaps in your crew.",
      effects: [{ t: "gain", what: "Carouse, Streetwise or Persuade" }, { t: "special", key: "cashBenefitRoll", args: { n: 1 } }],
    },
    {
      roll: 10,
      text: "You clash with a rival team.",
      effects: [
        {
          t: "check",
          check: "Melee 8+ or Deception 8+",
          pass: [{ t: "associate", kind: "ally", note: "From your crew." }],
          fail: [{ t: "benefitRolls", n: "term" }, { t: "associate", kind: "enemy" }],
        },
      ],
    },
    {
      roll: 11,
      text: "Your clan offers you a way back, at the price of a debt to an elder.",
      effects: [
        {
          t: "optional",
          prompt: "Accept the clan's offer of redemption?",
          yes: [{ t: "special", key: "redemption" }, { t: "associate", kind: "contact", note: "The clan elder you owe." }],
        },
      ],
    },
    {
      roll: 12,
      text: "You are conscripted as a Warrior grunt.",
      effects: [{ t: "nextTerm", career: "ge-warrior" }],
    },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "none",
  pension: false,
  notes: [
    "Any assignment is open to either gender.",
    "Aslan who fail a second qualification attempt end up here (or in Outlaw) with SOC 0.",
    "Event 12 forces at least one term in the Warrior career.",
    "A Tolerance result on a skill table is rerolled; only a second Tolerance counts.",
    "Humans take the Cash column only once when mustering out of this career.",
  ],
};
