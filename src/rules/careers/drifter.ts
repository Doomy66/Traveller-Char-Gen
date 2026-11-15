import type { Career } from "../types";

/** Drifter, CRB pp28-29. */
export const drifter: Career = {
  id: "drifter",
  name: "Drifter",
  source: { book: "CRB", page: 28 },
  description: "Wanderers and hitchhikers who roam the stars with no fixed purpose.",
  setting: "core",
  qualification: { check: null },
  assignments: [
    {
      id: "barbarian",
      name: "Barbarian",
      description: "A native of a primitive, low-technology world.",
      survival: "END 7+",
      advancement: "STR 7+",
      skills: ["Animals", "Carouse", "Melee (blade)", "Stealth", "Seafarer (personal or sail)", "Survival"],
    },
    {
      id: "wanderer",
      name: "Wanderer",
      description: "A space bum scraping by in slums and starports.",
      survival: "END 7+",
      advancement: "INT 7+",
      skills: ["Drive", "Deception", "Recon", "Stealth", "Streetwise", "Survival"],
    },
    {
      id: "scavenger",
      name: "Scavenger",
      description: "An asteroid miner or member of a salvage crew.",
      survival: "DEX 7+",
      advancement: "END 7+",
      skills: ["Pilot (small craft)", "Mechanic", "Astrogation", "Vacc Suit", "Profession", "Gun Combat"],
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["STR +1", "END +1", "DEX +1", "Language", "Profession", "Jack-of-all-Trades"],
    },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Athletics", "Melee (unarmed)", "Recon", "Streetwise", "Stealth", "Survival"],
    },
  ],
  ranks: [
    {
      assignments: ["barbarian"],
      ranks: [
        {},
        { bonus: "Survival 1" },
        { title: "Warrior", bonus: "Melee (blade) 1" },
        {},
        { title: "Chieftain", bonus: "Leadership 1" },
        {},
        { title: "Warlord" },
      ],
    },
    {
      assignments: ["wanderer"],
      ranks: [{}, { bonus: "Streetwise 1" }, {}, { bonus: "Deception 1" }, {}, {}, {}],
    },
    {
      assignments: ["scavenger"],
      ranks: [{}, { bonus: "Vacc Suit 1" }, {}, { bonus: "Profession (belter) 1 or Mechanic 1" }, {}, {}, {}],
    },
  ],
  benefits: {
    cash: [0, 0, 1000, 2000, 3000, 4000, 8000],
    other: ["Contact", "Weapon", "Ally", "Weapon", "EDU +1", "Ship Share", "2 Ship Shares"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    { roll: 2, text: "Injured.", effects: [{ t: "injury" }] },
    {
      roll: 3,
      text: "You cross a gang, a crooked official or some other foe.",
      effects: [{ t: "associate", kind: "enemy" }],
    },
    {
      roll: 4,
      text: "A dangerous illness leaves you weakened.",
      effects: [{ t: "gain", what: "END -1" }],
    },
    {
      roll: 5,
      text: "Someone you trusted sells you out.",
      effects: [
        {
          t: "convert",
          from: ["contact", "ally"],
          to: ["rival", "enemy"],
          otherwise: [
            {
              t: "choose",
              prompt: "Betrayed by a stranger: gain a Rival or an Enemy.",
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
            { min: 2, max: 2, text: "Arrested.", effects: [{ t: "nextTerm", career: "prisoner" }] },
            { min: 3, max: 12, effects: [] },
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "Something happened to you that you cannot remember.",
      effects: [{ t: "note", text: "A gap in your memory." }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "A patron offers you work, at the price of a favour owed.",
      effects: [
        {
          t: "optional",
          prompt: "Take the patron's job?",
          yes: [
            { t: "qualifyDM", dm: 4 },
            { t: "note", text: "You owe a patron a favour." },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You pick up useful tricks along the way.",
      effects: [{ t: "gain", what: "Jack-of-all-Trades, Survival, Streetwise or Melee (any)" }],
    },
    { roll: 5, text: "You scavenge something valuable.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "You run into something strange.",
      effects: [{ t: "special", key: "unusualEvent" }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Enemies come after you.",
      effects: [
        { t: "special", key: "associateIfNone", args: { kind: "enemy" } },
        { t: "check", check: "Melee 8+, Gun Combat 8+ or Stealth 8+", fail: [{ t: "injury" }] },
      ],
    },
    {
      roll: 9,
      text: "A chance at a risky but lucrative venture.",
      effects: [
        {
          t: "optional",
          prompt: "Join the venture?",
          yes: [
            {
              t: "roll",
              dice: "1D",
              results: [
                {
                  min: 1,
                  max: 2,
                  text: "It goes wrong.",
                  effects: [
                    {
                      t: "choose",
                      prompt: "Injured or arrested?",
                      options: [
                        { label: "Roll on the Injury table", effects: [{ t: "injury" }] },
                        { label: "Prisoner career next term", effects: [{ t: "nextTerm", career: "prisoner" }] },
                      ],
                    },
                  ],
                },
                { min: 3, max: 4, text: "You get away with nothing.", effects: [] },
                { min: 5, max: 6, text: "It pays off.", effects: [{ t: "benefitDM", dm: 4 }] },
              ],
            },
          ],
        },
      ],
    },
    { roll: 10, text: "Hard living sharpens your abilities.", effects: [{ t: "improveExisting" }] },
    { roll: 11, text: "You are pressed into military service.", effects: [{ t: "nextTerm", career: "draft" }] },
    { roll: 12, text: "You thrive on adversity.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "assignment",
  assignmentChange: "reroll",
  medical: "none",
  pension: false,
};
