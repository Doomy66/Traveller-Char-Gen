import type { Career } from "../types";

/** Rogue, CRB pp40-41. */
export const rogue: Career = {
  id: "rogue",
  name: "Rogue",
  source: { book: "CRB", page: 40 },
  description: "Criminals who get what they want by illegal or underhanded means.",
  setting: "core",
  qualification: { check: "DEX 6+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "thief",
      name: "Thief",
      description: "A burglar and swindler working for personal profit.",
      survival: "INT 6+",
      advancement: "DEX 6+",
      skills: ["Stealth", "Electronics", "Recon", "Streetwise", "Deception", "Athletics"],
    },
    {
      id: "enforcer",
      name: "Enforcer",
      description: "Muscle or a hired killer for a criminal outfit.",
      survival: "END 6+",
      advancement: "STR 6+",
      skills: ["Gun Combat", "Melee", "Streetwise", "Persuade", "Athletics", "Drive"],
    },
    {
      id: "pirate",
      name: "Pirate",
      description: "A raider preying on shipping between the stars.",
      survival: "DEX 6+",
      advancement: "INT 6+",
      skills: ["Pilot", "Astrogation", "Gunner", "Engineer", "Vacc Suit", "Melee"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["Carouse", "DEX +1", "END +1", "Gambler", "Melee", "Gun Combat"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Deception", "Recon", "Athletics", "Gun Combat", "Stealth", "Streetwise"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 10 },
      rows: ["Electronics", "Navigation", "Medic", "Investigate", "Broker", "Advocate"],
    },
  ],
  ranks: [
    {
      assignments: ["thief"],
      ranks: [{}, { bonus: "Stealth 1" }, {}, { bonus: "Streetwise 1" }, {}, { bonus: "Recon 1" }, {}],
    },
    {
      assignments: ["enforcer"],
      ranks: [
        {},
        { bonus: "Persuade 1" },
        {},
        { bonus: "Gun Combat 1 or Melee 1" },
        {},
        { bonus: "Streetwise 1" },
        {},
      ],
    },
    {
      assignments: ["pirate"],
      ranks: [
        { title: "Lackey" },
        { title: "Henchman", bonus: "Pilot 1 or Gunner 1" },
        { title: "Corporal" },
        { title: "Sergeant", bonus: "Gun Combat 1 or Melee 1" },
        { title: "Lieutenant" },
        { title: "Leader", bonus: "Leadership 1" },
        { title: "Captain" },
      ],
    },
  ],
  benefits: {
    cash: [0, 0, 10000, 10000, 50000, 100000, 100000],
    other: ["Ship Share", "Weapon", "INT +1", "1D Ship Shares", "Armour", "DEX +1", "2D Ship Shares"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Arrested and sent down.",
      effects: [{ t: "nextTerm", career: "prisoner" }],
    },
    {
      roll: 3,
      text: "Someone you trusted sells you out, and you may end up behind bars.",
      effects: [
        {
          t: "convert",
          from: ["contact", "ally"],
          to: ["rival", "enemy"],
          otherwise: [
            {
              t: "choose",
              options: [
                { label: "Rival", effects: [{ t: "associate", kind: "rival" }] },
                { label: "Enemy", effects: [{ t: "associate", kind: "enemy" }] },
              ],
            },
          ],
        },
        {
          t: "roll",
          dice: "2D",
          results: [
            { min: 2, max: 2, text: "Arrested as well.", effects: [{ t: "nextTerm", career: "prisoner" }] },
            { min: 3, max: 12, effects: [] },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "A job falls apart and you have to get off-planet fast.",
      effects: [{ t: "gain", what: "Deception 1, Pilot (small craft or spacecraft) 1, Athletics (dexterity) 1 or Gunner 1" }],
    },
    {
      roll: 5,
      text: "A detective or rival criminal drives you out and swears to find you.",
      effects: [{ t: "associate", kind: "enemy" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You are arrested and face charges.",
      effects: [
        {
          t: "choose",
          prompt: "Defend yourself or hire a lawyer?",
          options: [
            {
              label: "Defend yourself",
              effects: [
                {
                  t: "check",
                  check: "Advocate 8+",
                  pass: [{ t: "note", text: "Charges dropped." }],
                  fail: [
                    { t: "associate", kind: "enemy" },
                    { t: "nextTerm", career: "prisoner" },
                  ],
                },
              ],
            },
            {
              label: "Hire a lawyer",
              effects: [
                { t: "associate", kind: "contact", note: "Your lawyer" },
                { t: "benefitRolls", n: -1 },
              ],
            },
          ],
        },
      ],
    },
    { roll: 4, text: "You help plan a daring heist.", effects: [{ t: "gain", what: "Electronics 1 or Mechanic 1" }] },
    {
      roll: 5,
      text: "A crime pays off, but the victim wants revenge.",
      effects: [
        { t: "benefitDM", dm: 2 },
        { t: "associate", kind: "enemy" },
      ],
    },
    {
      roll: 6,
      text: "You get a chance to stab a fellow rogue in the back.",
      effects: [
        {
          t: "choose",
          prompt: "Betray them?",
          options: [
            { label: "Betray: DM+4 to next advancement", effects: [{ t: "advanceDM", dm: 4 }] },
            { label: "Refuse: gain them as an Ally", effects: [{ t: "associate", kind: "ally" }] },
          ],
        },
      ],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Months spent in the criminal underworld.",
      effects: [{ t: "gain", what: "Streetwise 1, Stealth 1, Melee 1 or Gun Combat 1" }],
    },
    {
      roll: 9,
      text: "You are caught up in a feud with a rival gang.",
      effects: [
        {
          t: "check",
          check: "Stealth 8+ or Gun Combat 8+",
          pass: [{ t: "benefitRolls", n: 1 }],
          fail: [{ t: "injury" }],
        },
      ],
    },
    {
      roll: 10,
      text: "You get mixed up in a gambling ring.",
      effects: [
        { t: "gain", what: "Gambler 1" },
        { t: "special", key: "wagerBenefitRolls", args: { check: "Gambler 8+" } },
      ],
    },
    {
      roll: 11,
      text: "A crime lord takes you on as a protege.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Tactics (military) 1", effects: [{ t: "gain", what: "Tactics (military) 1" }] },
            { label: "DM+4 to next advancement", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "You pull off a crime of legend.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "none",
  pension: false,
};
