import type { Career } from "../types";

/** Citizen, CRB pp26-27. */
export const citizen: Career = {
  id: "citizen",
  name: "Citizen",
  source: { book: "CRB", page: 26 },
  description: "Corporate staff, bureaucrats, industrial workers and frontier colonists.",
  setting: "core",
  qualification: { check: "EDU 5+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "corporate",
      name: "Corporate",
      description: "A manager or executive in a large company.",
      survival: "SOC 6+",
      advancement: "INT 6+",
      skills: ["Advocate", "Admin", "Broker", "Electronics (computers)", "Diplomat", "Leadership"],
    },
    {
      id: "worker",
      name: "Worker",
      description: "A blue-collar worker on an industrial world.",
      survival: "END 4+",
      advancement: "EDU 8+",
      skills: ["Drive", "Mechanic", "Electronics", "Engineer", "Profession", "Science"],
    },
    {
      id: "colonist",
      name: "Colonist",
      description: "A settler taming a newly founded colony.",
      survival: "INT 7+",
      advancement: "END 5+",
      skills: ["Animals", "Athletics", "Jack-of-all-Trades", "Drive", "Survival", "Recon"],
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["EDU +1", "INT +1", "Carouse", "Gambler", "Drive", "Jack-of-all-Trades"],
    },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Drive", "Flyer", "Streetwise", "Melee", "Steward", "Profession"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 10 },
      rows: ["Art", "Advocate", "Diplomat", "Language", "Electronics (computers)", "Medic"],
    },
  ],
  ranks: [
    {
      assignments: ["corporate"],
      ranks: [
        {},
        {},
        { title: "Manager", bonus: "Admin 1" },
        {},
        { title: "Senior Manager", bonus: "Advocate 1" },
        {},
        { title: "Director", bonus: "SOC +1" },
      ],
    },
    {
      assignments: ["worker"],
      ranks: [
        {},
        {},
        { title: "Technician", bonus: "Profession 1" },
        {},
        { title: "Craftsman", bonus: "Mechanic 1" },
        {},
        { title: "Master Technician", bonus: "Engineer 1" },
      ],
    },
    {
      assignments: ["colonist"],
      ranks: [
        {},
        {},
        { title: "Settler", bonus: "Survival 1" },
        {},
        { title: "Explorer", bonus: "Navigation 1" },
        {},
        { bonus: "Gun Combat 1" },
      ],
    },
  ],
  benefits: {
    cash: [2000, 5000, 10000, 10000, 10000, 50000, 100000],
    other: ["Ship Share", "Ally", "INT +1", "Gun", "EDU +1", "2 Ship Shares", "TAS Membership"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "A criminal gang makes your life a misery.",
      effects: [{ t: "associate", kind: "enemy", note: "A criminal gang." }],
    },
    {
      roll: 3,
      text: "A slump in interstellar trade costs you your job.",
      effects: [{ t: "gain", what: "SOC -1" }],
    },
    {
      roll: 4,
      text: "The authorities, or offworld interests, come after your business or colony.",
      effects: [
        {
          t: "choose",
          prompt: "Co-operate or refuse?",
          options: [
            {
              label: "Co-operate: shut down, but DM+2 to your next qualification roll",
              effects: [{ t: "qualifyDM", dm: 2 }],
            },
            { label: "Refuse: gain an Ally", effects: [{ t: "associate", kind: "ally" }] },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "Upheaval on your world forces you to flee offplanet.",
      effects: [{ t: "check", check: "Streetwise 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You are swept up in a revolution on your homeworld.",
      effects: [
        {
          t: "choose",
          prompt: "Pick a skill to gain at level 1, then roll it 8+.",
          options: [
            {
              label: "Advocate 1",
              effects: [
                { t: "gain", what: "Advocate 1" },
                {
                  t: "check",
                  check: "Advocate 8+",
                  pass: [{ t: "advanceDM", dm: 2 }],
                  fail: [{ t: "survivalDM", dm: -2, scope: "next" }],
                },
              ],
            },
            {
              label: "Persuade 1",
              effects: [
                { t: "gain", what: "Persuade 1" },
                {
                  t: "check",
                  check: "Persuade 8+",
                  pass: [{ t: "advanceDM", dm: 2 }],
                  fail: [{ t: "survivalDM", dm: -2, scope: "next" }],
                },
              ],
            },
            {
              label: "Explosives 1",
              effects: [
                { t: "gain", what: "Explosives 1" },
                {
                  t: "check",
                  check: "Explosives 8+",
                  pass: [{ t: "advanceDM", dm: 2 }],
                  fail: [{ t: "survivalDM", dm: -2, scope: "next" }],
                },
              ],
            },
            {
              label: "Streetwise 1",
              effects: [
                { t: "gain", what: "Streetwise 1" },
                {
                  t: "check",
                  check: "Streetwise 8+",
                  pass: [{ t: "advanceDM", dm: 2 }],
                  fail: [{ t: "survivalDM", dm: -2, scope: "next" }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You spend time working on and with heavy vehicles.",
      effects: [{ t: "gain", what: "Mechanic, Drive, Electronics, Flyer or Engineer" }],
    },
    { roll: 5, text: "Your business, company or colony prospers.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 10+", pass: [{ t: "anySkill", level: 1 }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You stumble on a secret you could profit from illegally.",
      effects: [
        {
          t: "optional",
          prompt: "Exploit the secret?",
          yes: [
            { t: "benefitDM", dm: 1 },
            {
              t: "choose",
              options: [
                { label: "Streetwise 1", effects: [{ t: "gain", what: "Streetwise 1" }] },
                { label: "Deception 1", effects: [{ t: "gain", what: "Deception 1" }] },
                { label: "A criminal Contact", effects: [{ t: "associate", kind: "contact", note: "A criminal." }] },
              ],
            },
          ],
        },
      ],
    },
    { roll: 9, text: "Your diligence or cunning is rewarded.", effects: [{ t: "advanceDM", dm: 2 }] },
    {
      roll: 10,
      text: "Technical work as a computer operator or surveyor.",
      effects: [{ t: "gain", what: "Electronics or Engineer" }],
    },
    {
      roll: 11,
      text: "You make a friend of a superior.",
      effects: [
        { t: "associate", kind: "ally" },
        {
          t: "choose",
          options: [
            { label: "Diplomat 1", effects: [{ t: "gain", what: "Diplomat 1" }] },
            { label: "DM+4 to your next advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "You rise to a position of power.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "assignment",
  assignmentChange: "newCareer",
  medical: "civil",
  pension: true,
};
