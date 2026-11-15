import type { Career } from "../types";

/** Prisoner, CRB pp56-57 (special rules p52). */
export const prisoner: Career = {
  id: "prisoner",
  name: "Prisoner",
  source: { book: "CRB", page: 56 },
  description: "Serving a sentence, deserved or not, behind prison walls.",
  setting: "core",
  qualification: { check: null, restricted: "prisoner" },
  assignments: [
    {
      id: "inmate",
      name: "Inmate",
      description: "Keeping your head down and doing your time.",
      survival: "END 7+",
      advancement: "STR 7+",
      skills: ["Stealth", "Melee (unarmed)", "Streetwise", "Survival", "Athletics (strength)", "Mechanic"],
    },
    {
      id: "thug",
      name: "Thug",
      description: "A gang member who bullies the other inmates.",
      survival: "STR 8+",
      advancement: "END 6+",
      skills: ["Persuade", "Melee (unarmed)", "Melee (unarmed)", "Melee (blade)", "Athletics (strength)", "Athletics (strength)"],
    },
    {
      id: "fixer",
      name: "Fixer",
      description: "The one who can get anything inside, at a price.",
      survival: "INT 9+",
      advancement: "END 5+",
      skills: ["Investigate", "Broker", "Deception", "Streetwise", "Stealth", "Admin"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "Melee (unarmed)", "END +1", "Jack-of-all-Trades", "EDU +1", "Gambler"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Athletics", "Deception", "Profession", "Streetwise", "Melee (unarmed)", "Persuade"] },
  ],
  ranks: [
    {
      assignments: "all",
      ranks: [
        { bonus: "Melee (unarmed) 1" },
        {},
        { bonus: "Athletics 1" },
        {},
        { bonus: "Advocate 1" },
        {},
        { bonus: "END +1" },
      ],
    },
  ],
  benefits: {
    cash: [0, 0, 100, 200, 500, 1000, 2500],
    other: [
      "Contact",
      "Blade",
      "Deception, Persuade or Stealth",
      "Ally",
      "Melee, Recon or Streetwise",
      "STR +1 or END +1",
      "Deception, Persuade and Stealth",
    ],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Accused of attacking a guard.",
      effects: [{ t: "parole", delta: 2 }],
    },
    {
      roll: 3,
      text: "A prison gang targets you.",
      effects: [
        {
          t: "choose",
          prompt: "Fight back?",
          options: [
            {
              label: "Fight back (Melee (unarmed) 8+)",
              effects: [
                {
                  t: "check",
                  check: "Melee (unarmed) 8+",
                  pass: [
                    { t: "associate", kind: "enemy" },
                    { t: "parole", delta: 1 },
                  ],
                  fail: [{ t: "injury", mode: "worst2" }],
                },
              ],
            },
            {
              label: "Do not fight: lose all Benefit rolls from this career",
              effects: [{ t: "benefitRolls", n: "career" }],
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "A guard decides they do not like you.",
      effects: [
        { t: "associate", kind: "enemy" },
        { t: "parole", delta: 1 },
      ],
    },
    {
      roll: 5,
      text: "News of your crimes reaches your homeworld.",
      effects: [{ t: "gain", what: "SOC -1" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "A chance to break out.",
      effects: [
        {
          t: "optional",
          prompt: "Try to escape?",
          yes: [
            {
              t: "check",
              check: "Stealth 10+ or Deception 10+",
              pass: [{ t: "leave" }],
              fail: [{ t: "parole", delta: 2 }],
            },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You are put to hard labour.",
      effects: [
        {
          t: "check",
          check: "END 8+",
          pass: [
            { t: "parole", delta: -1 },
            { t: "gain", what: "Athletics (any) 1, Mechanic 1 or Melee (unarmed) 1" },
          ],
          fail: [{ t: "parole", delta: 1 }],
        },
      ],
    },
    {
      roll: 5,
      text: "A gang offers you a way in.",
      effects: [
        {
          t: "optional",
          prompt: "Try to join the gang?",
          yes: [
            {
              t: "check",
              check: "Persuade 8+ or Melee 8+",
              pass: [
                { t: "parole", delta: 1 },
                { t: "survivalDM", dm: 1, scope: "career" },
                { t: "gain", what: "Deception 1, Persuade 1, Melee (unarmed) 1 or Stealth 1" },
              ],
              fail: [{ t: "associate", kind: "enemy" }],
            },
          ],
        },
      ],
    },
    {
      roll: 6,
      text: "Vocational training.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "anySkill" }] }],
    },
    {
      roll: 7,
      text: "Something happens inside the prison.",
      effects: [
        {
          t: "roll",
          dice: "1D",
          results: [
            {
              min: 1,
              max: 1,
              text: "A riot breaks out.",
              effects: [
                {
                  t: "roll",
                  dice: "1D",
                  results: [
                    { min: 1, max: 2, text: "Hurt in the riot.", effects: [{ t: "injury" }] },
                    { min: 3, max: 4, effects: [] },
                    { min: 5, max: 6, text: "Looted something useful.", effects: [{ t: "benefitRolls", n: 1 }] },
                  ],
                },
              ],
            },
            { min: 2, max: 2, text: "You befriend another inmate.", effects: [{ t: "associate", kind: "contact" }] },
            { min: 3, max: 3, text: "You make a Rival among inmates or guards.", effects: [{ t: "associate", kind: "rival" }] },
            { min: 4, max: 4, text: "Transferred to another prison.", effects: [{ t: "parole", delta: "reroll" }] },
            { min: 5, max: 5, text: "Good behaviour.", effects: [{ t: "parole", delta: -2 }] },
            {
              min: 6,
              max: 6,
              text: "Another prisoner attacks you.",
              effects: [{ t: "check", check: "Melee (unarmed) 8+", fail: [{ t: "injury" }] }],
            },
          ],
        },
      ],
    },
    { roll: 8, text: "A parole hearing.", effects: [{ t: "parole", delta: -1 }] },
    {
      roll: 9,
      text: "You can hire a new lawyer.",
      effects: [{ t: "special", key: "hireLawyer", args: { costPerLevelSquared: 1000, target: 8, reduce: "1D" } }],
    },
    {
      roll: 10,
      text: "You are given special duties inside.",
      effects: [{ t: "gain", what: "Admin, Advocate, Electronics (computers) or Steward" }],
    },
    { roll: 11, text: "The warden takes an interest in your case.", effects: [{ t: "parole", delta: -2 }] },
    {
      roll: 12,
      text: "A chance to save a guard's life.",
      effects: [
        {
          t: "optional",
          prompt: "Take the risk?",
          yes: [
            {
              t: "roll",
              dice: "2D",
              results: [
                { min: 2, max: 7, text: "Hurt in the attempt.", effects: [{ t: "injury" }] },
                {
                  min: 8,
                  max: 12,
                  text: "You save them.",
                  effects: [
                    { t: "associate", kind: "ally" },
                    { t: "parole", delta: -2 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  basicTraining: "service",
  assignmentChange: "free",
  medical: "none",
  pension: false,
  notes: [
    "Mishaps never force a prisoner out; release comes through the Parole Threshold.",
    "The Parole Threshold starts at 1D+2 and can never rise above 12.",
    "At the end of each term, an advancement roll above the Parole Threshold ends the sentence and the Traveller leaves; otherwise they serve another term.",
    "A new assignment may be chosen each term.",
    "Anagathics cannot be used in prison.",
  ],
};
