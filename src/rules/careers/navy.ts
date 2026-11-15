import type { Career } from "../types";

/** Navy, CRB pp36-37. */
export const navy: Career = {
  id: "navy",
  name: "Navy",
  source: { book: "CRB", page: 36 },
  description: "The interstellar fleet that guards space lanes against hostile powers and outlaws.",
  setting: "core",
  qualification: { check: "INT 6+", perPreviousCareer: -1, age: { age: 34, dm: -2 } },
  commission: "SOC 8+",
  assignments: [
    {
      id: "line-crew",
      name: "Line/Crew",
      description: "A general crewmember or officer aboard a warship.",
      survival: "INT 5+",
      advancement: "EDU 7+",
      skills: ["Electronics", "Mechanic", "Gun Combat", "Flyer", "Melee", "Vacc Suit"],
    },
    {
      id: "engineer-gunner",
      name: "Engineer/Gunner",
      description: "A technical specialist aboard a starship.",
      survival: "INT 6+",
      advancement: "EDU 6+",
      skills: ["Engineer", "Mechanic", "Electronics", "Engineer", "Gunner", "Flyer"],
    },
    {
      id: "flight",
      name: "Flight",
      description: "A pilot of shuttles, fighters and other small craft.",
      survival: "DEX 7+",
      advancement: "EDU 5+",
      skills: ["Pilot", "Flyer", "Gunner", "Pilot (small craft)", "Astrogation", "Electronics"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "INT +1", "EDU +1", "SOC +1"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Pilot", "Vacc Suit", "Athletics", "Gunner", "Mechanic", "Gun Combat"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Electronics", "Astrogation", "Engineer", "Flyer", "Medic", "Admin"],
    },
    {
      id: "officer",
      name: "Officer",
      kind: "officer",
      requires: { commissioned: true },
      rows: ["Leadership", "Electronics", "Pilot", "Melee (blade)", "Admin", "Tactics (naval)"],
    },
  ],
  ranks: [
    {
      assignments: "all",
      ranks: [
        { title: "Crewman" },
        { title: "Able Spacehand", bonus: "Mechanic 1" },
        { title: "Petty Officer, 3rd class", bonus: "Vacc Suit 1" },
        { title: "Petty Officer, 2nd class" },
        { title: "Petty Officer, 1st class", bonus: "END +1" },
        { title: "Chief Petty Officer" },
        { title: "Master Chief" },
      ],
    },
    {
      assignments: "all",
      officer: true,
      ranks: [
        {},
        { title: "Ensign", bonus: "Melee (blade) 1" },
        { title: "Sublieutenant", bonus: "Leadership 1" },
        { title: "Lieutenant" },
        { title: "Commander", bonus: "Tactics (naval) 1" },
        { title: "Captain", bonus: "SOC 10 or SOC +1" },
        { title: "Admiral", bonus: "SOC 12 or SOC +1" },
      ],
    },
  ],
  benefits: {
    cash: [1000, 5000, 5000, 10000, 20000, 50000, 50000],
    other: [
      "Personal Vehicle or Ship Share",
      "INT +1",
      "EDU +1 or 2 Ship Shares",
      "Weapon",
      "TAS Membership",
      "Ship's Boat or 2 Ship Shares",
      "SOC +2",
    ],
  },
  mishaps: [
    {
      roll: 1,
      text: "Badly wounded in combat.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "A botched revival from cold sleep leaves your muscles wasted.",
      effects: [
        { t: "gain", what: "STR -1, DEX -1 or END -1" },
        { t: "stay" },
      ],
    },
    {
      roll: 3,
      text: "A battle hinges on your performance, and either way you leave the service.",
      effects: [
        {
          t: "special",
          key: "byAssignment",
          args: {
            cases: {
              "line-crew": [
                {
                  t: "check",
                  check: "Electronics (sensors) 8+ or Gunner 8+",
                  pass: [{ t: "keepBenefit" }],
                  fail: [{ t: "note", text: "Blamed for heavy damage to the ship; court-martialled and discharged." }],
                },
              ],
              "engineer-gunner": [
                {
                  t: "check",
                  check: "Mechanic 8+ or Vacc Suit 8+",
                  pass: [{ t: "keepBenefit" }],
                  fail: [{ t: "note", text: "Blamed for heavy damage to the ship; court-martialled and discharged." }],
                },
              ],
              flight: [
                {
                  t: "check",
                  check: "Pilot (small craft) 8+ or Pilot (spacecraft) 8+ or Tactics (naval) 8+",
                  pass: [{ t: "keepBenefit" }],
                  fail: [{ t: "note", text: "Blamed for heavy damage to the ship; court-martialled and discharged." }],
                },
              ],
            },
          },
        },
      ],
    },
    {
      roll: 4,
      text: "You are blamed for an accident that kills several crew.",
      effects: [
        {
          t: "choose",
          prompt: "Were you responsible?",
          options: [
            {
              label: "Yes: guilt drives you to excel",
              effects: [{ t: "special", key: "skillRoll", args: { count: 1 } }],
            },
            {
              label: "No: you were scapegoated",
              effects: [
                { t: "associate", kind: "enemy", note: "the officer who blamed you" },
                { t: "keepBenefit" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "A feud with an officer or shipmate forces you out of the Navy.",
      effects: [{ t: "associate", kind: "rival" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You fall in with a shipboard gambling ring.",
      effects: [
        { t: "gain", what: "Gambler 1 or Deception 1" },
        {
          t: "optional",
          prompt: "Bet big (Gambler 8+)?",
          yes: [
            {
              t: "check",
              check: "Gambler 8+",
              pass: [{ t: "benefitRolls", n: 1 }],
              fail: [{ t: "benefitRolls", n: -1 }],
            },
          ],
        },
      ],
    },
    { roll: 4, text: "Handed a special duty aboard ship.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 5,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    {
      roll: 6,
      text: "Your ship fights in a significant battle.",
      effects: [{ t: "gain", what: "Electronics 1, Engineer 1, Gunner 1 or Pilot 1" }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Your ship carries a diplomatic mission.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Recon 1", effects: [{ t: "gain", what: "Recon 1" }] },
            { label: "Diplomat 1", effects: [{ t: "gain", what: "Diplomat 1" }] },
            { label: "Steward 1", effects: [{ t: "gain", what: "Steward 1" }] },
            { label: "A Contact", effects: [{ t: "associate", kind: "contact" }] },
          ],
        },
      ],
    },
    {
      roll: 9,
      text: "You thwart a crime aboard ship, such as mutiny or sabotage.",
      effects: [
        { t: "associate", kind: "enemy" },
        { t: "advanceDM", dm: 2 },
      ],
    },
    {
      roll: 10,
      text: "A chance arises to misuse your post for gain.",
      effects: [
        {
          t: "optional",
          prompt: "Abuse your position?",
          yes: [{ t: "benefitRolls", n: 1 }],
          no: [{ t: "advanceDM", dm: 2 }],
        },
      ],
    },
    {
      roll: 11,
      text: "Your commanding officer takes an interest in you.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Tactics (naval) 1", effects: [{ t: "gain", what: "Tactics (naval) 1" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "Your heroism in battle saves the ship.", effects: [{ t: "promoteOrCommission" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
};
