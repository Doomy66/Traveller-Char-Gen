import type { Career } from "../types";

/** Agent, CRB pp22-23. The worked example the other careers follow. */
export const agent: Career = {
  id: "agent",
  name: "Agent",
  source: { book: "CRB", page: 22 },
  description: "Police, spies and corporate operatives who work in the shadows.",
  setting: "core",
  qualification: { check: "INT 6+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "law-enforcement",
      name: "Law Enforcement",
      description: "A police officer or detective.",
      survival: "END 6+",
      advancement: "INT 6+",
      skills: ["Investigate", "Recon", "Streetwise", "Stealth", "Melee", "Advocate"],
    },
    {
      id: "intelligence",
      name: "Intelligence",
      description: "A spy or saboteur.",
      survival: "INT 7+",
      advancement: "INT 5+",
      skills: ["Investigate", "Recon", "Electronics (comms)", "Stealth", "Persuade", "Deception"],
    },
    {
      id: "corporate",
      name: "Corporate",
      description: "Spying on rival organisations for a corporation.",
      survival: "INT 5+",
      advancement: "INT 7+",
      skills: ["Investigate", "Electronics (computers)", "Stealth", "Carouse", "Deception", "Streetwise"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["Gun Combat", "DEX +1", "END +1", "Melee", "INT +1", "Athletics"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Streetwise", "Drive", "Investigate", "Flyer", "Recon", "Gun Combat"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Advocate", "Language", "Explosives", "Medic", "Vacc Suit", "Electronics"],
    },
  ],
  ranks: [
    {
      assignments: ["law-enforcement"],
      ranks: [
        { title: "Rookie" },
        { title: "Corporal", bonus: "Streetwise 1" },
        { title: "Sergeant" },
        { title: "Detective" },
        { title: "Lieutenant", bonus: "Investigate 1" },
        { title: "Chief", bonus: "Admin 1" },
        { title: "Commissioner", bonus: "SOC +1" },
      ],
    },
    {
      assignments: ["intelligence", "corporate"],
      ranks: [
        {},
        { title: "Agent", bonus: "Deception 1" },
        { title: "Field Agent", bonus: "Investigate 1" },
        {},
        { title: "Special Agent", bonus: "Gun Combat 1" },
        { title: "Assistant Director" },
        { title: "Director" },
      ],
    },
  ],
  benefits: {
    cash: [1000, 2000, 5000, 7500, 10000, 25000, 50000],
    other: [
      "Scientific Equipment",
      "INT +1",
      "Ship Share",
      "Weapon",
      "Cybernetic Implant",
      "SOC +1 or Cybernetic Implant",
      "TAS Membership",
    ],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured on the job.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Someone you were investigating offers you a deal to walk away.",
      effects: [
        {
          t: "choose",
          prompt: "Take the deal?",
          options: [
            { label: "Accept: leave quietly", effects: [{ t: "note", text: "Took a deal and left the service." }] },
            {
              label: "Refuse: take the consequences",
              effects: [
                { t: "injury", mode: "worst2" },
                { t: "associate", kind: "enemy" },
                { t: "anySkill" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 3,
      text: "An investigation goes badly wrong, or leads too high, and ends your career.",
      effects: [
        {
          t: "check",
          check: "Advocate 8+",
          pass: [{ t: "keepBenefit" }],
          on2: [{ t: "nextTerm", career: "prisoner" }],
        },
      ],
    },
    {
      roll: 4,
      text: "You learn something you should not, and people want you dead for it.",
      effects: [
        { t: "associate", kind: "enemy" },
        { t: "gain", what: "Deception 1" },
      ],
    },
    {
      roll: 5,
      text: "Your work follows you home and someone close to you is hurt.",
      effects: [{ t: "special", key: "injureAssociate" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "An investigation turns dangerous.",
      effects: [
        {
          t: "check",
          check: "Investigate 8+ or Streetwise 8+",
          pass: [{ t: "gain", what: "Deception, Jack-of-all-Trades, Persuade or Tactics" }],
          fail: [{ t: "mishap" }],
        },
      ],
    },
    { roll: 4, text: "You complete a mission for your superiors and are rewarded.", effects: [{ t: "benefitDM", dm: 1 }] },
    { roll: 5, text: "You build a network of contacts.", effects: [{ t: "associate", kind: "contact", count: "D3" }] },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You go undercover to investigate an enemy.",
      effects: [
        {
          t: "check",
          check: "Deception 8+",
          pass: [{ t: "otherTable", careers: ["rogue", "citizen"], table: "events", thenSkillRoll: true }],
          fail: [{ t: "otherTable", careers: ["rogue", "citizen"], table: "mishaps" }],
        },
      ],
    },
    { roll: 9, text: "You go above and beyond the call of duty.", effects: [{ t: "advanceDM", dm: 2 }] },
    { roll: 10, text: "Specialist training in vehicles.", effects: [{ t: "gain", what: "Drive 1, Flyer 1, Pilot 1 or Gunner 1" }] },
    {
      roll: 11,
      text: "A senior agent takes you under their wing.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Investigate +1", effects: [{ t: "gain", what: "Investigate" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "You uncover a major conspiracy against your employers.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "newCareer",
  medical: "civil",
  pension: true,
};
