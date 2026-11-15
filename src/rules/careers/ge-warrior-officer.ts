import type { Career, Effect } from "../types";

/** Lose 1D SOC. */
const lose1dSoc: Effect = {
  t: "roll",
  dice: "1D",
  results: [1, 2, 3, 4, 5, 6].map((n) => ({ min: n, max: n, effects: [{ t: "gain", what: `SOC -${n}` } as Effect] })),
};

const victory: Effect[] = [
  {
    t: "choose",
    prompt: "Your unit wins.",
    options: [
      { label: "SOC +1", effects: [{ t: "gain", what: "SOC +1" }] },
      { label: "DM+2 to the next advancement roll", effects: [{ t: "advanceDM", dm: 2 }] },
    ],
  },
];

/** Gain a level in a skill, then check that skill at 8+. */
function trainAndTest(skill: string, gain: string): { label: string; effects: Effect[] } {
  return {
    label: skill,
    effects: [
      { t: "gain", what: gain },
      { t: "check", check: `${skill} 8+`, pass: victory },
    ],
  };
}

/** Warrior Officer, GE pp66-67. Replaces Army officers in the Glorious Empire. */
export const geWarriorOfficer: Career = {
  id: "ge-warrior-officer",
  name: "Warrior Officer",
  source: { book: "GE", page: 66 },
  description: "The honoured officer caste of the Imperial Guard, including its assassins.",
  setting: "glorious-empire",
  qualification: { check: "Rite 9+" },
  assignments: [
    {
      id: "leader",
      name: "Leader",
      description: "Commands Aslan warriors against the Hierate.",
      survival: "END 7+",
      advancement: "INT 6+",
      skills: ["Tactics (military)", "Recon", "Melee", "Leadership", "Gun Combat", "Heavy Weapons"],
      gender: "male",
    },
    {
      id: "executive-officer",
      name: "Executive Officer",
      description: "Advises male officers on technical and administrative matters.",
      survival: "END 7+",
      advancement: "EDU 7+",
      skills: ["Admin", "Medic", "Electronics", "Profession", "Advocate", "Navigation"],
      gender: "female",
    },
    {
      id: "assassin",
      name: "Assassin",
      description: "A hidden agent of ritual warfare and revenge.",
      survival: "END 8+",
      advancement: "DEX 6+",
      skills: ["Melee", "Stealth", "Streetwise", "Recon", "Deception", "Athletics"],
      gender: "male",
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["Independence [male] or Admin [female]", "STR +1", "DEX +1", "END +1", "INT +1", "Athletics"],
    },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Tactics (military)", "Drive or Flyer", "Gun Combat", "Melee (natural)", "Leadership", "Vacc Suit"],
    },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Navigation", "Electronics", "Melee", "Recon", "Tactics (military)", "Survival"],
    },
  ],
  ranks: [
    {
      assignments: ["leader"],
      ranks: [
        { title: "Probationary Lieutenant" },
        { title: "Junior Lieutenant", bonus: "Vacc Suit 1" },
        { title: "Lieutenant" },
        { title: "Captain", bonus: "Leadership 1" },
        { title: "Commandant" },
        { title: "Division General" },
        { title: "General", bonus: "TER +2 and SOC 10" },
      ],
    },
    {
      assignments: ["executive-officer"],
      ranks: [
        { title: "Probationary Lieutenant" },
        { title: "Junior Lieutenant", bonus: "Electronics 1" },
        { title: "Lieutenant" },
        { title: "Captain", bonus: "Admin 1" },
        { title: "Executive Major" },
        { title: "Division Chief of Staff" },
        { title: "Chief of Staff", bonus: "3 Clan Shares" },
      ],
    },
    {
      // The book prints no Assassin table; its third table is headed SUPPORT
      // (a repeat of the Warrior's). It is the only one left, so it is used here.
      assignments: ["assassin"],
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
    cash: [500, 1000, 5000, 10000, 20000, 30000, 50000, 100000, 200000],
    other: [
      "Clan Share",
      "END +1",
      "EDU +1",
      "Weapon or Combat Implant",
      "Secret School",
      "TER +2",
      "SOC +1",
      "5 Clan Shares",
      "Transport",
    ],
    dms: [
      { if: "SOC9", dm: 1 },
      { if: "male", dm: 1 },
      { if: "mercenary", dm: 1 },
    ],
  },
  mishaps: [
    {
      roll: 1,
      text: "Badly hurt, fitted with a combat implant and sent back.",
      effects: [{ t: "injury", mode: "worst2" }, { t: "special", key: "combatImplant" }, { t: "stay" }],
    },
    {
      roll: 2,
      text: "Your failure costs your clan dearly, and you are hurt.",
      effects: [{ t: "injury" }, { t: "gain", what: "SOC -1" }],
    },
    {
      roll: 3,
      text: "A shift in the ahriy hierarchy costs you face and rank.",
      effects: [{ t: "rank", delta: -1 }, { t: "gain", what: "SOC -2" }, { t: "stay" }],
    },
    {
      roll: 4,
      text: "You lose a battle.",
      effects: [{ t: "injury" }, { t: "associate", kind: "rival", note: "The foe who beat you." }, { t: "stay" }],
    },
    {
      roll: 5,
      text: "Captured by a Hierate clan and later exchanged; the shame ends your career.",
      effects: [
        {
          t: "choose",
          prompt: "Return to the Empire or stay in the Hierate?",
          options: [
            { label: "Return to the Empire", effects: [{ t: "special", key: "onlyLandlessOrOutlaw" }] },
            {
              label: "Stay in the Hierate",
              effects: [
                { t: "associate", kind: "contact", note: "In the Hierate." },
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
      text: "You lead warriors through a brutal ground war.",
      effects: [{ t: "gain", what: "Recon, Heavy Weapons, Vacc Suit or Drive" }],
    },
    {
      roll: 4,
      text: "Attaché duty at the capital on Syoakh.",
      effects: [
        { t: "associate", kind: "ally" },
        { t: "gain", what: "Independence [male], Admin [female], Diplomat, Streetwise or Deception" },
      ],
    },
    {
      roll: 5,
      text: "You strike a great blow for the Empire.",
      effects: [{ t: "promote" }, { t: "gain", what: "SOC +1" }],
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
            { label: "Ransom him: TER +1", effects: [{ t: "gain", what: "TER +1" }] },
            { label: "Free him: gain an Ally", effects: [{ t: "associate", kind: "ally" }] },
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
                { t: "check", check: "Melee 8+", pass: [{ t: "advanceDM", dm: 2 }], fail: [{ t: "benefitRolls", n: "term" }] },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 11,
      text: "Mercenary Event: you lead mercenaries flawlessly in the Dustbelt wars.",
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
      text: "Mercenary Event: you fight with a mercenary unit beyond the Empire.",
      effects: [
        { t: "special", key: "mercenaryEvent" },
        {
          t: "choose",
          prompt: "Which skill do you learn?",
          options: [
            trainAndTest("Gun Combat", "Gun Combat"),
            trainAndTest("Melee (natural)", "Melee (natural)"),
            trainAndTest("Independence", "Independence [male]"),
            trainAndTest("Vacc Suit", "Vacc Suit"),
          ],
        },
      ],
    },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
  notes: [
    "Leader and Assassin are male only; Executive Officer is female only.",
    "A Warrior event can add an Aslan's Warrior terms as a DM to qualify here.",
    "Benefit rolls get DM+1 if any term in this career included a Mercenary Event (not expressible in benefits.dms).",
    "The book prints no Assassin rank table; the repeated Support table is used for Assassins.",
    "If the Traveller fails to qualify, they get one more attempt at another career at DM-1; failing that, they become a Landless One or Outlaw with SOC 0.",
    "A Tolerance result on a skill table is rerolled; only a second Tolerance counts.",
    "Humans take the Cash column only once when mustering out of this career.",
  ],
};
