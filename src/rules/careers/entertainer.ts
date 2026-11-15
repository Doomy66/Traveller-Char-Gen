import type { Career } from "../types";

/** Entertainer, CRB pp30-31. */
export const entertainer: Career = {
  id: "entertainer",
  name: "Entertainer",
  source: { book: "CRB", page: 30 },
  description: "Reporters, artists and celebrities working in the media.",
  setting: "core",
  qualification: { check: "DEX or INT 5+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "artist",
      name: "Artist",
      description: "A writer, holographer or other creative.",
      survival: "SOC 6+",
      advancement: "INT 6+",
      skills: ["Art", "Carouse", "Electronics (computers)", "Gambler", "Persuade", "Profession"],
    },
    {
      id: "journalist",
      name: "Journalist",
      description: "A reporter covering local or interstellar news.",
      survival: "EDU 7+",
      advancement: "INT 5+",
      skills: ["Art (holography or write)", "Electronics", "Drive", "Investigate", "Recon", "Streetwise"],
    },
    {
      id: "performer",
      name: "Performer",
      description: "An actor, dancer, athlete or other public performer.",
      survival: "INT 5+",
      advancement: "DEX 7+",
      skills: ["Art (performer or instrument)", "Athletics", "Carouse", "Deception", "Stealth", "Streetwise"],
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["DEX +1", "INT +1", "SOC +1", "Language", "Carouse", "Jack-of-all-Trades"],
    },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Art", "Carouse", "Deception", "Drive", "Persuade", "Steward"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 10 },
      rows: ["Advocate", "Broker", "Deception", "Science", "Streetwise", "Diplomat"],
    },
  ],
  ranks: [
    {
      assignments: ["artist"],
      ranks: [
        {},
        { bonus: "Art 1" },
        {},
        { bonus: "Investigate 1" },
        {},
        { title: "Famous Artist", bonus: "SOC +1" },
        {},
      ],
    },
    {
      assignments: ["journalist"],
      ranks: [
        {},
        { title: "Freelancer", bonus: "Electronics (comms) 1" },
        { title: "Staff Writer", bonus: "Investigate 1" },
        {},
        { title: "Correspondent", bonus: "Persuade 1" },
        {},
        { title: "Senior Correspondent", bonus: "SOC +1" },
      ],
    },
    {
      assignments: ["performer"],
      ranks: [
        {},
        { bonus: "DEX +1" },
        {},
        { bonus: "STR +1" },
        {},
        { title: "Famous Performer", bonus: "SOC +1" },
        {},
      ],
    },
  ],
  benefits: {
    cash: [0, 0, 10000, 10000, 40000, 40000, 80000],
    other: ["Contact", "SOC +1", "Contact", "SOC +1", "INT +1", "2 Ship Shares", "SOC +1 and EDU +1"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "A scandal, which you either uncovered or were part of, ends your career.",
      effects: [],
    },
    {
      roll: 3,
      text: "The public turns against you.",
      effects: [{ t: "gain", what: "SOC -1" }],
    },
    {
      roll: 4,
      text: "A colleague sells you out.",
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
      ],
    },
    {
      roll: 5,
      text: "A project, tour or expedition goes wrong and leaves you stranded far from home.",
      effects: [{ t: "gain", what: "Survival 1, Pilot 1, Persuade 1 or Streetwise 1" }],
    },
    {
      roll: 6,
      text: "Censorship or controversy pushes you out; perhaps you found something you should not have.",
      effects: [{ t: "qualifyDM", dm: 2 }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You join a controversial show or event.",
      effects: [
        {
          t: "check",
          check: "Art 8+ or Investigate 8+",
          pass: [{ t: "gain", what: "SOC +1" }],
          fail: [{ t: "gain", what: "SOC -1" }],
        },
      ],
    },
    {
      roll: 4,
      text: "You move in your homeworld's celebrity circles.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Carouse 1", effects: [{ t: "gain", what: "Carouse 1" }] },
            { label: "Persuade 1", effects: [{ t: "gain", what: "Persuade 1" }] },
            { label: "Steward 1", effects: [{ t: "gain", what: "Steward 1" }] },
            { label: "A Contact", effects: [{ t: "associate", kind: "contact" }] },
          ],
        },
      ],
    },
    { roll: 5, text: "A popular work makes you a minor celebrity.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "You find a patron for your work.",
      effects: [
        { t: "advanceDM", dm: 2 },
        { t: "associate", kind: "ally" },
      ],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "A chance to expose a dubious political leader on your homeworld.",
      effects: [
        {
          t: "choose",
          prompt: "Go after the leader?",
          options: [
            { label: "Refuse and back the leader", effects: [{ t: "note", text: "Stood by a questionable leader." }] },
            {
              label: "Speak out",
              effects: [
                { t: "associate", kind: "enemy" },
                {
                  t: "check",
                  check: "Art 8+ or Persuade 8+",
                  pass: [{ t: "improveExisting" }],
                  fail: [{ t: "improveExisting" }, { t: "mishap" }],
                },
              ],
            },
          ],
        },
      ],
    },
    { roll: 9, text: "A tour takes you across the sector.", effects: [{ t: "associate", kind: "contact", count: "D3" }] },
    {
      roll: 10,
      text: "The theft of your work leads you into the underworld.",
      effects: [{ t: "gain", what: "Streetwise 1, Investigate 1, Recon 1 or Stealth 1" }],
    },
    {
      roll: 11,
      text: "Your life takes a strange and charmed turn.",
      effects: [{ t: "special", key: "unusualEvent" }],
    },
    { roll: 12, text: "You win a prestigious award.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "newCareer",
  medical: "civil",
  pension: true,
};
