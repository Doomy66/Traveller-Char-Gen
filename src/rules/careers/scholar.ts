import type { Career } from "../types";

/** Scholar, CRB pp42-43. */
export const scholar: Career = {
  id: "scholar",
  name: "Scholar",
  source: { book: "CRB", page: 42 },
  description: "Scientists, researchers and doctors who study the world and heal its people.",
  setting: "core",
  qualification: { check: "INT 6+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "field-researcher",
      name: "Field Researcher",
      description: "A researcher who works in the wilds as much as the lab.",
      survival: "END 6+",
      advancement: "INT 6+",
      skills: ["Electronics", "Vacc Suit", "Navigation", "Survival", "Investigate", "Science"],
    },
    {
      id: "scientist",
      name: "Scientist",
      description: "A researcher at an institute or corporation, or working alone.",
      survival: "EDU 4+",
      advancement: "INT 8+",
      skills: ["Admin", "Engineer", "Science", "Science", "Electronics", "Science"],
    },
    {
      id: "physician",
      name: "Physician",
      description: "A doctor or medical researcher.",
      survival: "EDU 4+",
      advancement: "EDU 8+",
      skills: ["Medic", "Electronics", "Investigate", "Medic", "Persuade", "Science"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["INT +1", "EDU +1", "SOC +1", "DEX +1", "END +1", "Language"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Drive or Flyer", "Electronics", "Diplomat", "Medic", "Investigate", "Science"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 10 },
      rows: ["Art", "Advocate", "Electronics", "Language", "Engineer", "Science"],
    },
  ],
  ranks: [
    {
      assignments: ["field-researcher"],
      ranks: [
        {},
        { bonus: "Science 1" },
        { bonus: "Electronics (computers) 1" },
        { bonus: "Investigate 1" },
        {},
        { bonus: "Science 2" },
        {},
      ],
    },
    {
      assignments: ["scientist"],
      ranks: [
        {},
        { bonus: "Science 1" },
        { bonus: "Electronics (computers) 1" },
        { bonus: "Investigate 1" },
        {},
        { bonus: "Science 2" },
        {},
      ],
    },
    {
      assignments: ["physician"],
      ranks: [{}, { bonus: "Medic 1" }, {}, { bonus: "Science 1" }, {}, { bonus: "Science 2" }, {}],
    },
  ],
  benefits: {
    cash: [5000, 10000, 20000, 30000, 40000, 60000, 100000],
    other: ["INT +1", "EDU +1", "2 Ship Shares", "SOC +1", "Scientific Equipment", "Lab Ship", "Lab Ship"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "An accident hurts several people and you take the blame.",
      effects: [
        { t: "special", key: "injuryBest2" },
        { t: "associate", kind: "rival" },
      ],
    },
    {
      roll: 3,
      text: "The government meddles in your research for political or religious reasons.",
      effects: [
        {
          t: "choose",
          prompt: "Carry on openly or in secret?",
          options: [
            {
              label: "Openly: Science +1 and an Enemy",
              effects: [
                { t: "gain", what: "Science" },
                { t: "associate", kind: "enemy" },
              ],
            },
            {
              label: "Secretly: Science +1 and SOC -2",
              effects: [
                { t: "gain", what: "Science" },
                { t: "gain", what: "SOC -2" },
              ],
            },
          ],
        },
        { t: "stay" },
      ],
    },
    {
      roll: 4,
      text: "An expedition goes wrong and you are stranded; your post is gone when you return.",
      effects: [{ t: "gain", what: "Survival 1 or Athletics (dexterity or endurance) 1" }],
    },
    {
      roll: 5,
      text: "Someone sabotages your work.",
      effects: [
        {
          t: "choose",
          prompt: "Salvage and quit, or start over?",
          options: [
            { label: "Give up: leave, keeping this term's Benefit roll", effects: [{ t: "keepBenefit" }] },
            {
              label: "Start again: lose all Benefit rolls from this career but stay",
              effects: [{ t: "benefitRolls", n: "career" }, { t: "stay" }],
            },
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "A rival discredits you or steals your research.",
      effects: [{ t: "associate", kind: "rival" }, { t: "stay" }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You are asked to do research that troubles your conscience.",
      effects: [
        {
          t: "optional",
          prompt: "Accept the work?",
          yes: [
            { t: "benefitRolls", n: 1 },
            { t: "special", key: "distinctSpecialities", args: { skill: "Science", count: 2 } },
            { t: "associate", kind: "enemy", count: "D3" },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You work on a secret project for a patron.",
      effects: [{ t: "gain", what: "Medic 1, Science 1, Engineer 1, Electronics 1 or Investigate 1" }],
    },
    { roll: 5, text: "You win a prestigious prize.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "anySkill", level: 1 }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You have a chance to get ahead by cheating.",
      effects: [
        {
          t: "optional",
          prompt: "Cheat?",
          yes: [
            {
              t: "check",
              check: "Deception 8+ or Admin 8+",
              pass: [
                { t: "benefitDM", dm: 2 },
                { t: "anySkill" },
                { t: "associate", kind: "enemy" },
              ],
              fail: [
                { t: "associate", kind: "enemy" },
                { t: "benefitRolls", n: -1 },
              ],
            },
          ],
        },
      ],
    },
    { roll: 9, text: "A breakthrough in your field.", effects: [{ t: "advanceDM", dm: 2 }] },
    {
      roll: 10,
      text: "Bureaucratic or legal trouble pulls you away from your work.",
      effects: [{ t: "gain", what: "Admin 1, Advocate 1, Persuade 1 or Diplomat 1" }],
    },
    {
      roll: 11,
      text: "An eccentric, brilliant mentor takes you on.",
      effects: [
        { t: "associate", kind: "ally" },
        {
          t: "choose",
          options: [
            { label: "Science +1", effects: [{ t: "gain", what: "Science" }] },
            { label: "DM+4 to next advancement", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "Your work produces a major breakthrough.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "civil",
  pension: true,
};
