import type { Career } from "../types";

/** Noble, CRB pp38-39. */
export const noble: Career = {
  id: "noble",
  name: "Noble",
  source: { book: "CRB", page: 38 },
  description: "Members of the upper class, often wealthy and not always useful.",
  setting: "core",
  qualification: { check: "SOC 10+", perPreviousCareer: -1, automaticIf: { stat: "SOC", min: 10 } },
  assignments: [
    {
      id: "administrator",
      name: "Administrator",
      description: "An official in planetary government, or the ruler of a domain.",
      survival: "INT 4+",
      advancement: "EDU 6+",
      skills: ["Admin", "Advocate", "Broker", "Diplomat", "Leadership", "Persuade"],
    },
    {
      id: "diplomat",
      name: "Diplomat",
      description: "A diplomat or other official of the state.",
      survival: "INT 5+",
      advancement: "SOC 7+",
      skills: ["Advocate", "Carouse", "Electronics", "Steward", "Diplomat", "Deception"],
    },
    {
      id: "dilettante",
      name: "Dilettante",
      description: "A celebrity famous mostly for being famous.",
      survival: "SOC 5+",
      advancement: "INT 7+",
      skills: ["Carouse", "Deception", "Flyer", "Streetwise", "Gambler", "Jack-of-all-Trades"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "Gambler", "Gun Combat", "Melee"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Admin", "Advocate", "Electronics", "Diplomat", "Investigate", "Persuade"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Science", "Advocate", "Language", "Leadership", "Diplomat", "Art"],
    },
  ],
  ranks: [
    {
      assignments: ["administrator"],
      ranks: [
        { title: "Assistant" },
        { title: "Clerk", bonus: "Admin 1" },
        { title: "Supervisor" },
        { title: "Manager", bonus: "Advocate 1" },
        { title: "Chief" },
        { title: "Director", bonus: "Leadership 1" },
        { title: "Minister" },
      ],
    },
    {
      assignments: ["diplomat"],
      ranks: [
        { title: "Intern" },
        { title: "3rd Secretary", bonus: "Admin 1" },
        { title: "2nd Secretary" },
        { title: "1st Secretary", bonus: "Advocate 1" },
        { title: "Counsellor" },
        { title: "Minister", bonus: "Diplomat 1" },
        { title: "Ambassador" },
      ],
    },
    {
      assignments: ["dilettante"],
      ranks: [
        { title: "Wastrel" },
        {},
        { title: "Ingrate", bonus: "Carouse 1" },
        {},
        { title: "Black Sheep", bonus: "Persuade 1" },
        {},
        { title: "Scoundrel", bonus: "Jack-of-all-Trades 1" },
      ],
    },
  ],
  benefits: {
    cash: [10000, 10000, 50000, 50000, 100000, 100000, 200000],
    other: ["Ship Share", "2 Ship Shares", "Blade", "SOC +1", "TAS Membership", "Yacht", "SOC +1 and Yacht"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "A scandal in the family costs you your post.",
      effects: [{ t: "gain", what: "SOC -1" }],
    },
    {
      roll: 3,
      text: "Disaster or war engulfs your world.",
      effects: [{ t: "check", check: "Stealth 8+ or Deception 8+", fail: [{ t: "injury" }] }],
    },
    {
      roll: 4,
      text: "Political rivals push you out of your position.",
      effects: [
        { t: "gain", what: "Diplomat or Advocate" },
        { t: "associate", kind: "rival" },
      ],
    },
    {
      roll: 5,
      text: "Someone sends an assassin after you.",
      effects: [{ t: "check", check: "END 8+", fail: [{ t: "injury" }] }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Someone challenges you to a duel over a point of honour.",
      effects: [
        {
          t: "choose",
          prompt: "Accept the duel?",
          options: [
            { label: "Refuse", effects: [{ t: "gain", what: "SOC -1" }] },
            {
              label: "Accept",
              effects: [
                {
                  t: "check",
                  check: "Melee (blade) 8+",
                  pass: [{ t: "gain", what: "SOC +1" }],
                  fail: [{ t: "injury" }, { t: "gain", what: "SOC -1" }],
                },
                { t: "gain", what: "Melee (blade), Leadership, Tactics (any) or Deception" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "Life as a ruler or socialite brings varied experience.",
      effects: [{ t: "gain", what: "Animals (riding) 1, Art 1, Carouse 1 or Streetwise 1" }],
    },
    { roll: 5, text: "A wealthy relative leaves you a gift.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "You become a player in your world's political intrigues.",
      effects: [
        { t: "gain", what: "Advocate, Admin, Diplomat or Persuade" },
        { t: "associate", kind: "rival" },
      ],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "A noble conspiracy tries to recruit you.",
      effects: [
        {
          t: "choose",
          prompt: "Join the conspiracy?",
          options: [
            { label: "Refuse", effects: [{ t: "associate", kind: "enemy", note: "the conspiracy" }] },
            {
              label: "Accept",
              effects: [
                {
                  t: "check",
                  check: "Deception 8+ or Persuade 8+",
                  pass: [{ t: "gain", what: "Deception, Persuade, Tactics or Carouse" }],
                  fail: [{ t: "mishap" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 9,
      text: "Your rule is praised as just, or your family keeps funding your idleness.",
      effects: [
        { t: "associate", kind: "enemy", note: "a jealous relative or an unhappy subject" },
        { t: "advanceDM", dm: 2 },
      ],
    },
    {
      roll: 10,
      text: "You charm and scheme your way through high society.",
      effects: [
        { t: "gain", what: "Carouse, Diplomat, Persuade or Steward" },
        { t: "associate", kind: "rival" },
        { t: "associate", kind: "ally" },
      ],
    },
    {
      roll: 11,
      text: "You ally yourself with a powerful, charismatic noble.",
      effects: [
        { t: "associate", kind: "ally" },
        {
          t: "choose",
          options: [
            { label: "Leadership +1", effects: [{ t: "gain", what: "Leadership" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "The Imperium takes notice of your work.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "civil",
  pension: true,
};
