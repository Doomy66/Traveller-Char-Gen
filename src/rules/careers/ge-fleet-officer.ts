import type { Career, Effect } from "../types";

/** Lose 1D SOC. */
const lose1dSoc: Effect = {
  t: "roll",
  dice: "1D",
  results: [1, 2, 3, 4, 5, 6].map((n) => ({ min: n, max: n, effects: [{ t: "gain", what: `SOC -${n}` } as Effect] })),
};

/** Gain 1D Benefit rolls. */
const gain1dBenefitRolls: Effect = {
  t: "roll",
  dice: "1D",
  results: [1, 2, 3, 4, 5, 6].map((n) => ({ min: n, max: n, effects: [{ t: "benefitRolls", n } as Effect] })),
};

/** Fleet Officer, GE pp62-63. Replaces Space Officer in the Glorious Empire. */
export const geFleetOfficer: Career = {
  id: "ge-fleet-officer",
  name: "Fleet Officer",
  source: { book: "GE", page: 62 },
  description: "The officer caste of the Grand Fleet, kept apart from the enlisted ranks.",
  setting: "glorious-empire",
  qualification: { check: "Rite 9+" },
  assignments: [
    {
      id: "commander",
      name: "Commander",
      description: "Commands a starship of the Grand Fleet.",
      survival: "SOC 8+",
      advancement: "INT 5+",
      skills: ["Tactics (naval)", "Diplomat", "Leadership", "Pilot", "Gunner", "Tactics (naval)"],
      gender: "male",
    },
    {
      id: "shipmaster",
      name: "Shipmaster",
      description: "Runs a ship's administration and advises its captain on technical matters.",
      survival: "EDU 7+",
      advancement: "EDU 6+",
      skills: ["Admin", "Engineer", "Electronics", "Deception", "Mechanic", "Broker"],
      gender: "female",
    },
    {
      id: "navigator",
      name: "Navigator",
      description: "Plots the ship's course through jump space.",
      survival: "INT 7+",
      advancement: "SOC 7+",
      skills: ["Astrogation", "Pilot", "Engineer (j-drive)", "Electronics", "Leadership", "Astrogation"],
      gender: "female",
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["INT +1", "EDU +1", "Carouse", "Jack-of-All-Trades", "Melee (natural)", "SOC +1"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Electronics", "Gun Combat", "Pilot", "Athletics", "Vacc Suit", "Gunner"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Admin", "Advocate", "Persuade", "Leadership", "Science or Medic", "Tactics (naval)"],
    },
  ],
  ranks: [
    {
      assignments: ["commander"],
      ranks: [
        { title: "Probationary Intendant" },
        { title: "Intendant", bonus: "Leadership 1" },
        { title: "Lieutenant" },
        { title: "Senior Lieutenant" },
        { title: "Commander", bonus: "Tactics (naval) 1" },
        { title: "Captain" },
        { title: "Admiral", bonus: "TER +2 and SOC 10" },
      ],
    },
    {
      assignments: ["shipmaster"],
      ranks: [
        { title: "Probationary Intendant" },
        { title: "Intendant", bonus: "Admin 1" },
        { title: "Lieutenant" },
        { title: "Senior Lieutenant", bonus: "Advocate 1" },
        { title: "Executive Lieutenant" },
        { title: "Executive" },
        { title: "Chief of Staff", bonus: "2 Clan Shares" },
      ],
    },
    {
      assignments: ["navigator"],
      ranks: [
        { title: "Trainee" },
        { title: "Junior Navigator", bonus: "Astrogation 1" },
        {},
        { title: "Navigator", bonus: "Electronics (computers) 1" },
        {},
        {},
        { title: "Senior Navigator", bonus: "2 Clan Shares" },
      ],
    },
  ],
  benefits: {
    cash: [1000, 5000, 5000, 10000, 20000, 50000, 50000, 50000],
    other: [
      "3 Clan Shares",
      "INT +1",
      "EDU +2",
      "5 Clan Shares",
      "TER +2",
      "Brotherhood of the Empire",
      "SOC +2",
      "Courier",
    ],
    dms: [
      { if: "SOC9", dm: 1 },
      { if: "male", dm: 1 },
    ],
  },
  mishaps: [
    { roll: 1, text: "Badly hurt in service.", effects: [{ t: "injury", mode: "worst2" }] },
    {
      roll: 2,
      text: "Your ship is crippled by the Hierate and the blame lands on you.",
      effects: [{ t: "check", check: "Advocate 8+ or Melee 8+", fail: [{ t: "benefitRolls", n: "term" }] }],
    },
    {
      roll: 3,
      text: "Clan politics turn against you and cost you rank and standing.",
      effects: [{ t: "rank", delta: -1 }, { t: "gain", what: "SOC -2" }, { t: "stay" }, { t: "associate", kind: "enemy" }],
    },
    {
      roll: 4,
      text: "The Hierate destroys your ship in battle.",
      effects: [{ t: "associate", kind: "rival", note: "The foe who beat you." }, { t: "stay" }],
    },
    {
      roll: 5,
      text: "Captured by a Hierate clan and later exchanged; the shame ends your career.",
      effects: [
        { t: "special", key: "setStat", args: { stat: "TER", value: 0 } },
        {
          t: "choose",
          prompt: "Return to the Empire or stay in the Hierate?",
          options: [
            {
              label: "Return to the Empire",
              effects: [
                { t: "special", key: "setStat", args: { stat: "SOC", value: 0 } },
                { t: "special", key: "onlyLandlessOrOutlaw" },
              ],
            },
            {
              label: "Stay in the Hierate",
              effects: [
                { t: "associate", kind: "contact" },
                { t: "special", key: "setStat", args: { stat: "SOC", value: 2 } },
                { t: "special", key: "leaveEmpire", args: { to: "hierate" } },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "Wounded, patched up with a combat implant and sent back.",
      effects: [{ t: "injury" }, { t: "special", key: "combatImplant" }, { t: "stay" }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Hierate corsairs attack your ship.",
      effects: [
        {
          t: "check",
          check: "Tactics 8+ or Engineer 8+",
          pass: [{ t: "advanceDM", dm: 2 }],
          fail: [{ t: "benefitRolls", n: "term" }, { t: "associate", kind: "enemy", note: "The corsair captain." }],
        },
      ],
    },
    {
      roll: 4,
      text: "Raiding Hierate commerce gives you a chance to skim the profits.",
      effects: [
        {
          t: "optional",
          prompt: "Skim the profits?",
          yes: [
            {
              t: "check",
              check: "Deception 8+ or Admin 8+",
              pass: [gain1dBenefitRolls],
              fail: [
                { t: "leave" },
                { t: "special", key: "setStat", args: { stat: "SOC", value: 2 } },
                { t: "special", key: "onlyLandlessOrOutlaw" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "A posting in alien space.",
      effects: [{ t: "gain", what: "Tolerance, Diplomat, Language or Science" }],
    },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    { roll: 8, text: "You are granted a fief on an Empire world.", effects: [{ t: "gain", what: "TER +2" }] },
    {
      roll: 9,
      text: "You take an enemy commander prisoner.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Ransom them: TER +2", effects: [{ t: "gain", what: "TER +2" }] },
            { label: "Free them: gain an Ally", effects: [{ t: "associate", kind: "ally" }] },
          ],
        },
      ],
    },
    {
      roll: 10,
      text: "A rival challenges you to a duel.",
      effects: [
        {
          t: "choose",
          prompt: "Accept the duel?",
          options: [
            { label: "Refuse: lose 1D SOC", effects: [lose1dSoc] },
            {
              label: "Accept",
              effects: [
                {
                  t: "check",
                  check: "Melee 8+",
                  pass: [{ t: "advanceDM", dm: 2 }, { t: "gain", what: "Melee (natural)" }],
                  fail: [{ t: "benefitRolls", n: "term" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 11,
      text: "You win an admiral's friendship and a place in his fleet.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Tactics (naval) if male, Admin if female", effects: [{ t: "gain", what: "Tactics (naval) [male] or Admin [female]" }] },
            { label: "DM+4 to the next advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    {
      roll: 12,
      text: "You strike a great blow for the Empire.",
      effects: [{ t: "promote" }, { t: "gain", what: "SOC +1" }],
    },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
  notes: [
    "Commander is male only; Shipmaster and Navigator are female only.",
    "A Fleet event can add the Traveller's Fleet terms as a DM to qualify here.",
    "If the Traveller fails to qualify, they get one more attempt at another career at DM-1; failing that, they become a Landless One or Outlaw with SOC 0.",
    "A Tolerance result on a skill table is rerolled; only a second Tolerance counts.",
    "Humans take the Cash column only once when mustering out of this career.",
  ],
};
