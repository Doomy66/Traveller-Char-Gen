import type { Career, Effect } from "../types";

/** Gain a level in a skill, then check that skill at 8+. */
function trainAndTest(skill: string, gain: string, pass: Effect[], fail?: Effect[]): { label: string; effects: Effect[] } {
  return {
    label: skill,
    effects: [
      { t: "gain", what: gain },
      { t: "check", check: `${skill} 8+`, pass, ...(fail ? { fail } : {}) },
    ],
  };
}

const victory: Effect[] = [
  {
    t: "choose",
    prompt: "Your unit wins.",
    options: [
      { label: "SOC +1", effects: [{ t: "gain", what: "SOC +1" }] },
      { label: "DM+2 to one Benefit roll", effects: [{ t: "benefitDM", dm: 2 }] },
    ],
  },
];
const defeat: Effect[] = [{ t: "advanceDM", dm: -2 }];

/** Warrior, GE pp64-65. Replaces Army in the Glorious Empire. */
export const geWarrior: Career = {
  id: "ge-warrior",
  name: "Warrior",
  source: { book: "GE", page: 64 },
  description: "The Empire's ground forces; males fight while females serve in support.",
  setting: "glorious-empire",
  qualification: { check: "Rite 6+" },
  assignments: [
    {
      id: "imperial-guard",
      name: "Imperial Guard",
      description: "Front-line troops facing the Hierate.",
      survival: "END 8+",
      advancement: "STR 5+",
      skills: ["Vacc Suit", "Gun Combat", "Heavy Weapons", "Recon", "Stealth", "Athletics"],
      gender: "male",
    },
    {
      id: "dragoon",
      name: "Dragoon",
      description: "Crews grav tanks, mobile artillery, fighters and other war machines.",
      survival: "DEX 8+",
      advancement: "INT 6+",
      skills: ["Drive or Flyer", "Gunner (turret)", "Heavy Weapons", "Mechanic", "Electronics", "Drive or Flyer"],
      gender: "male",
    },
    {
      id: "support",
      name: "Support",
      description: "A mechanic, medic, signaller or combat engineer.",
      survival: "END 6+",
      advancement: "INT 6+",
      skills: ["Medic", "Mechanic", "Electronics", "Navigation", "Admin", "Explosives"],
      gender: "female",
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["Independence [male] or Admin [female,slave]", "STR +1", "DEX +1", "END +1", "Gun Combat", "Athletics"],
    },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Independence [male] or Admin [female,slave]", "STR +1", "DEX +1", "END +1", "Gun Combat", "Athletics"],
    },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Navigation", "Electronics", "Explosives", "Mechanic", "Tactics (military)", "Survival"],
    },
  ],
  ranks: [
    {
      assignments: ["imperial-guard", "dragoon"],
      ranks: [
        { title: "Recruit" },
        { title: "Warrior (Khir)", bonus: "Melee 1" },
        { title: "Warrior (Khirko)" },
        { title: "Warrior (Khirko'i)", bonus: "END +1" },
        { title: "Veteran Warrior" },
        { title: "Honoured Warrior" },
        { title: "Supreme Honoured Warrior", bonus: "3 Clan Shares" },
      ],
    },
    {
      assignments: ["support"],
      ranks: [
        { title: "Recruit Technician" },
        { title: "Combat Technician", bonus: "Mechanic 1" },
        { title: "Veteran Technician" },
        { title: "Warsister", bonus: "EDU +1" },
        { title: "Veteran Warsister" },
        { title: "Honoured Warsister" },
        { title: "Supreme Honoured Warsister", bonus: "2 Clan Shares" },
      ],
    },
  ],
  benefits: {
    cash: [500, 1000, 5000, 10000, 20000, 50000, 50000, 100000],
    other: [
      "Clan Share",
      "EDU +1",
      "END +1",
      "Weapon or Combat Implant",
      "Secret School",
      "2 Clan Shares",
      "SOC +1",
      "5 Clan Shares",
    ],
    dms: [{ if: "male", dm: 1 }, { if: "mercenary", dm: 1 }],
  },
  mishaps: [
    {
      roll: 1,
      text: "Badly hurt, fitted with a combat implant and sent back.",
      effects: [{ t: "injury", mode: "worst2" }, { t: "special", key: "combatImplant" }, { t: "stay" }],
    },
    {
      roll: 2,
      text: "A superior has you busted down a rank.",
      effects: [{ t: "rank", delta: -1 }, { t: "associate", kind: "rival" }, { t: "stay" }],
    },
    {
      roll: 3,
      text: "Cut off behind enemy lines.",
      effects: [
        { t: "gain", what: "Stealth, Survival, Streetwise or Gun Combat" },
        {
          t: "choose",
          prompt: "Defect to the Hierate?",
          options: [
            {
              label: "Defect: start a new career in the Hierate",
              effects: [
                { t: "special", key: "setStat", args: { stat: "SOC", value: 2 } },
                { t: "special", key: "leaveEmpire", args: { to: "hierate" } },
              ],
            },
            { label: "Stay in the Empire and return to service", effects: [{ t: "stay" }] },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "Captured, then ransomed back to your clan in disgrace.",
      effects: [{ t: "gain", what: "SOC -1" }, { t: "special", key: "onlyLandlessOrOutlaw" }],
    },
    {
      roll: 5,
      text: "A dangerous skirmish puts you in harm's way.",
      effects: [
        {
          t: "choose",
          prompt: "Fight bravely?",
          options: [
            {
              label: "Fight bravely",
              effects: [{ t: "check", check: "Gun Combat 8+ or Athletics 8+", pass: [{ t: "stay" }], fail: [{ t: "injury" }] }],
            },
            { label: "Hold back and leave the career", effects: [{ t: "note", text: "Refused to fight and left the Warriors." }] },
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
      text: "Sent to the front line against the Hierate.",
      effects: [
        { t: "check", check: "Recon 8+ or Gun Combat 8+", fail: [{ t: "injury" }] },
        { t: "gain", what: "Stealth, Medic or Explosives" },
      ],
    },
    {
      roll: 4,
      text: "Garrison duty at a clan outpost.",
      effects: [{ t: "associate", kind: "contact" }, { t: "gain", what: "Melee (natural), Electronics or Mechanic" }],
    },
    {
      roll: 5,
      text: "You carry the war into Hierate territory.",
      effects: [
        {
          t: "choose",
          prompt: "Which skill do you learn?",
          options: [
            trainAndTest("Melee (natural)", "Melee (natural)", victory, defeat),
            trainAndTest("Gun Combat", "Gun Combat", victory, defeat),
            trainAndTest("Independence", "Independence [male]", victory, defeat),
            trainAndTest("Survival", "Survival", victory, defeat),
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    { roll: 8, text: "You fight alongside the dog soldiers.", effects: [{ t: "gain", what: "Language or Tolerance" }] },
    {
      roll: 9,
      text: "You duel to defend your ahriy's honour.",
      effects: [
        { t: "check", check: "Melee (natural) 8+", pass: [{ t: "gain", what: "SOC +1" }], fail: [{ t: "gain", what: "SOC -1" }] },
        { t: "associate", kind: "rival" },
      ],
    },
    {
      roll: 10,
      text: "Aslan only: you are considered for the officer caste.",
      effects: [{ t: "special", key: "termsAsQualifyDM", args: { career: "ge-warrior-officer", species: "aslan" } }],
    },
    {
      roll: 11,
      text: "Mercenary Event: you fight as a mercenary in the Dustbelt.",
      effects: [
        { t: "special", key: "mercenaryEvent" },
        {
          t: "choose",
          options: [
            { label: "Tactics (military) if male, Electronics if female", effects: [{ t: "gain", what: "Tactics (military) [male] or Electronics [female]" }] },
            { label: "DM+3 to the next advancement roll", effects: [{ t: "advanceDM", dm: 3 }] },
          ],
        },
      ],
    },
    {
      roll: 12,
      text: "Mercenary Event: you distinguish yourself as a mercenary.",
      effects: [{ t: "special", key: "mercenaryEvent" }, { t: "promote" }, { t: "gain", what: "SOC +1" }],
    },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
  notes: [
    "Imperial Guard and Dragoon are male only; Support is female only.",
    "Benefit rolls get DM+1 if any term in this career included a Mercenary Event (not expressible in benefits.dms).",
    "If the Traveller fails to qualify, they get one more attempt at another career at DM-1; failing that, they become a Landless One or Outlaw with SOC 0.",
    "A Tolerance result on a skill table is rerolled; only a second Tolerance counts.",
    "Humans take the Cash column only once when mustering out of this career.",
  ],
};
