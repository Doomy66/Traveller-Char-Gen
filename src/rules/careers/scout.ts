import type { Career } from "../types";

/** Scout, CRB pp44-45. */
export const scout: Career = {
  id: "scout",
  name: "Scout",
  source: { book: "CRB", page: 44 },
  description: "The exploratory service: surveying worlds, charting space and carrying messages.",
  setting: "core",
  qualification: { check: "INT 5+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "courier",
      name: "Courier",
      description: "Carrying messages and valuable cargo between worlds.",
      survival: "END 5+",
      advancement: "EDU 9+",
      skills: ["Electronics", "Flyer", "Pilot (spacecraft)", "Engineer", "Athletics", "Astrogation"],
    },
    {
      id: "surveyor",
      name: "Surveyor",
      description: "Visiting frontier worlds to judge their value.",
      survival: "END 6+",
      advancement: "INT 8+",
      skills: ["Electronics", "Persuade", "Pilot", "Navigation", "Diplomat", "Streetwise"],
    },
    {
      id: "explorer",
      name: "Explorer",
      description: "Going beyond the edge of the charts into unknown space.",
      survival: "END 7+",
      advancement: "EDU 7+",
      skills: ["Electronics", "Pilot", "Engineer", "Science", "Stealth", "Recon"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "INT +1", "EDU +1", "Jack-of-all-Trades"] },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Pilot (small craft or spacecraft)", "Survival", "Mechanic", "Astrogation", "Vacc Suit", "Gun Combat"],
    },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Medic", "Language", "Seafarer", "Explosives", "Science", "Jack-of-all-Trades"],
    },
  ],
  ranks: [
    {
      assignments: "all",
      ranks: [
        {},
        { title: "Scout", bonus: "Vacc Suit 1" },
        {},
        { title: "Senior Scout", bonus: "Pilot 1" },
        {},
        {},
        {},
      ],
    },
  ],
  benefits: {
    cash: [20000, 20000, 30000, 30000, 50000, 50000, 50000],
    other: ["Ship Share", "INT +1", "EDU +1", "Weapon", "Weapon", "Scout Ship", "Scout Ship"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Your years in the service leave psychological scars.",
      effects: [{ t: "gain", what: "INT -1 or SOC -1" }],
    },
    {
      roll: 3,
      text: "Your ship is crippled and you make your own way back to base.",
      effects: [
        { t: "associate", kind: "contact", count: "1D" },
        { t: "associate", kind: "enemy", count: "D3" },
      ],
    },
    {
      roll: 4,
      text: "You accidentally spark a conflict between the Imperium and a minor world or species.",
      effects: [
        { t: "associate", kind: "rival" },
        { t: "gain", what: "Diplomat 1" },
      ],
    },
    {
      roll: 5,
      text: "Your ship is found adrift and you remember nothing of what happened.",
      effects: [{ t: "note", text: "Found adrift with no memory of what happened." }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Hostile ships ambush you.",
      effects: [
        {
          t: "choose",
          prompt: "Run or negotiate?",
          options: [
            {
              label: "Run (Pilot 8+)",
              effects: [
                {
                  t: "check",
                  check: "Pilot 8+",
                  pass: [{ t: "gain", what: "Electronics (sensors) 1" }],
                  fail: [{ t: "note", text: "Ship destroyed; cannot re-enlist in the Scouts." }, { t: "leave" }],
                },
                { t: "associate", kind: "enemy" },
              ],
            },
            {
              label: "Negotiate (Persuade 10+)",
              effects: [
                {
                  t: "check",
                  check: "Persuade 10+",
                  pass: [{ t: "gain", what: "Electronics (sensors) 1" }],
                  fail: [{ t: "note", text: "Ship destroyed; cannot re-enlist in the Scouts." }, { t: "leave" }],
                },
                { t: "associate", kind: "enemy" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You survey an alien world.",
      effects: [{ t: "gain", what: "Animals (riding or training) 1, Survival 1, Recon 1 or Science 1" }],
    },
    { roll: 5, text: "You give exemplary service.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "Years spent hopping from world to world.",
      effects: [{ t: "gain", what: "Astrogation 1, Electronics 1, Navigation 1, Pilot (small craft) 1 or Mechanic 1" }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "A chance to gather intelligence on an alien species.",
      effects: [
        {
          t: "check",
          check: "Electronics 8+ or Deception 8+",
          pass: [
            { t: "associate", kind: "ally", note: "In the Imperium" },
            { t: "advanceDM", dm: 2 },
          ],
          fail: [{ t: "mishap", eject: false }],
        },
      ],
    },
    {
      roll: 9,
      text: "Your ship is among the first to reach survivors of a disaster.",
      effects: [
        {
          t: "check",
          check: "Medic 8+ or Engineer 8+",
          pass: [
            { t: "associate", kind: "contact" },
            { t: "advanceDM", dm: 2 },
          ],
          fail: [{ t: "associate", kind: "enemy" }],
        },
      ],
    },
    {
      roll: 10,
      text: "Long service on the edges of Charted Space.",
      effects: [
        {
          t: "check",
          check: "Survival 8+ or Pilot 8+",
          pass: [
            { t: "associate", kind: "contact", note: "Among an alien species" },
            { t: "anySkill" },
          ],
          fail: [{ t: "mishap", eject: false }],
        },
      ],
    },
    {
      roll: 11,
      text: "You carry a vital message for the Imperium.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Diplomat +1", effects: [{ t: "gain", what: "Diplomat" }] },
            { label: "DM+4 to next advancement", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "You find something of great value to the Imperium.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "none",
  pension: false,
};
