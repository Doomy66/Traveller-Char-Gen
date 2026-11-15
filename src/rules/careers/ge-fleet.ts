import type { Career } from "../types";

/** Fleet, GE pp60-61. Replaces Spacer in the Glorious Empire. */
export const geFleet: Career = {
  id: "ge-fleet",
  name: "Fleet",
  source: { book: "GE", page: 60 },
  description: "Crew of the Grand Imperial Fleet, from couriers to ageing capital ships.",
  setting: "glorious-empire",
  qualification: { check: "Rite 8+" },
  assignments: [
    {
      id: "pilot",
      name: "Pilot",
      description: "Flies anything from couriers and fighters to capital ships.",
      survival: "DEX 8+",
      advancement: "INT 5+",
      skills: ["Pilot (small craft)", "Pilot (spacecraft)", "Pilot (capital ships)", "Tactics (naval)", "Gunner (turret)", "DEX +1"],
      gender: "male",
    },
    {
      id: "gunner",
      name: "Gunner",
      description: "Crews a ship's weapons against the Empire's foes.",
      survival: "INT 7+",
      advancement: "DEX 6+",
      skills: ["Gunner (turret)", "Gunner (any)", "Tactics (naval)", "Athletics (dexterity)", "Electronics", "DEX +1"],
      gender: "male",
    },
    {
      id: "engineer",
      name: "Engineer",
      description: "Keeps a starship running with too few spare parts.",
      survival: "END 7+",
      advancement: "INT 5+",
      skills: ["Electronics", "Engineer (m-drive)", "Engineer (j-drive)", "Engineer (power)", "Engineer (any)", "EDU +1"],
      gender: "female",
    },
    {
      id: "crew",
      name: "Crew",
      description: "A deckhand or shipboard labourer.",
      survival: "EDU 5+",
      advancement: "INT 7+",
      skills: ["Steward", "Mechanic", "Medic", "Admin", "Vacc Suit", "Gun Combat"],
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["Independence [male] or Admin [female,slave]", "DEX +1", "INT +1", "Melee (natural or blade)", "Jack-of-All-Trades", "Vacc Suit"],
    },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Melee [male,slave] or Broker [female]", "Flyer", "Mechanic", "Athletics", "Electronics", "Vacc Suit"],
    },
    {
      id: "advanced-male",
      name: "Advanced Education (male)",
      kind: "advanced",
      requires: { minEdu: 8, gender: "male" },
      rows: ["Pilot", "Electronics (sensors)", "Tactics (naval)", "Independence", "Leadership", "Gunner"],
    },
    {
      id: "advanced-female",
      name: "Advanced Education (female)",
      kind: "advanced",
      requires: { minEdu: 8, gender: "female" },
      rows: ["Astrogation", "Electronics", "Admin", "Advocate", "Profession", "Science"],
    },
  ],
  ranks: [
    {
      assignments: ["pilot", "gunner"],
      ranks: [
        { title: "Recruit" },
        { title: "Spacehand", bonus: "Vacc Suit" },
        { title: "Veteran Spacehand" },
        { title: "Honoured Spacehand", bonus: "EDU +1" },
        { title: "Petty Officer" },
        { title: "Veteran Petty Officer" },
        { title: "Honoured Petty Officer", bonus: "3 Clan Shares" },
      ],
    },
    {
      assignments: ["engineer", "crew"],
      ranks: [
        { title: "Recruit" },
        { title: "Spacehand", bonus: "Mechanic" },
        { title: "Veteran Spacehand" },
        { title: "Honoured Spacehand", bonus: "EDU +1" },
        { title: "Petty Officer" },
        { title: "Veteran Petty Officer" },
        { title: "Honoured Petty Officer", bonus: "2 Clan Shares" },
      ],
    },
  ],
  benefits: {
    cash: [500, 1000, 1000, 5000, 5000, 10000, 20000, 30000],
    other: [
      "Clan Share",
      "INT +1",
      "EDU +1",
      "Weapon or Augmentation",
      "Brotherhood of the Empire",
      "2 Clan Shares",
      "SOC +1",
      "3 Clan Shares",
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
      text: "A superior has you busted down a rank.",
      effects: [{ t: "rank", delta: -1 }, { t: "associate", kind: "rival" }, { t: "stay" }],
    },
    {
      roll: 3,
      text: "An alien parasite gets into you.",
      effects: [{ t: "check", check: "END 8+", fail: [{ t: "gain", what: "END -1" }] }, { t: "stay" }],
    },
    {
      roll: 4,
      text: "Accused of smuggling contraband into the Empire, you are thrown out.",
      effects: [{ t: "gain", what: "SOC -2" }, { t: "special", key: "onlyLandlessOrOutlaw" }],
    },
    {
      roll: 5,
      text: "You cross your commanding officer.",
      effects: [{ t: "gain", what: "SOC -1" }, { t: "benefitRolls", n: -1 }, { t: "stay" }],
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
      text: "A Hierate clan ship attacks your vessel.",
      effects: [
        {
          t: "check",
          check: "Pilot 8+ or Gunner 8+ or Mechanic 8+",
          pass: [{ t: "advanceDM", dm: 2 }],
          fail: [{ t: "benefitRolls", n: "term" }],
        },
      ],
    },
    {
      roll: 4,
      text: "A raid on a Hierate port for black market goods.",
      effects: [
        {
          t: "check",
          check: "Admin 8+ or Deception 8+",
          pass: [{ t: "benefitRolls", n: 3 }],
          fail: [{ t: "advanceDM", dm: -3 }],
        },
      ],
    },
    {
      roll: 5,
      text: "You are considered for the officer caste.",
      effects: [{ t: "special", key: "termsAsQualifyDM", args: { career: "ge-fleet-officer" } }],
    },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Service on a raider or mercenary cruiser shows you foreign worlds.",
      effects: [{ t: "gain", what: "Language, Streetwise or Tolerance" }],
    },
    {
      roll: 9,
      text: "A run of savage battles against the Hierate.",
      effects: [
        {
          t: "choose",
          prompt: "Heroism or prudence?",
          options: [
            {
              label: "Heroism",
              effects: [
                { t: "check", check: "DEX 9+", fail: [{ t: "injury" }] },
                { t: "advanceDM", dm: 2 },
              ],
            },
            {
              label: "Prudence",
              effects: [{ t: "check", check: "Stealth 8+", fail: [{ t: "gain", what: "SOC -1" }] }],
            },
          ],
        },
      ],
    },
    {
      roll: 10,
      text: "The captain trusts you with a ceremonial duty.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Steward +1", effects: [{ t: "gain", what: "Steward" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    {
      roll: 11,
      text: "You serve under a hero of the Empire.",
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
    "Pilot and Gunner are male only; Engineer is female only; Crew is open to either.",
    "If the Traveller fails to qualify, they get one more attempt at another career at DM-1; failing that, they become a Landless One or Outlaw with SOC 0.",
    "A Tolerance result on a skill table is rerolled; only a second Tolerance counts.",
    "Humans take the Cash column only once when mustering out of this career.",
  ],
};
