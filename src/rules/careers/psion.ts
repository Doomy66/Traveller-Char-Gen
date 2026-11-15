import type { Career } from "../types";

/** Psion, CRB pp236-237 (psionics rules pp228-229). */
export const psion: Career = {
  id: "psion",
  name: "Psion",
  source: { book: "CRB", page: 236 },
  description: "Travellers who devote themselves to developing their psionic gifts.",
  setting: "core",
  qualification: { check: "PSI 6+", perPreviousCareer: -1, restricted: "psion" },
  assignments: [
    {
      id: "wild-talent",
      name: "Wild Talent",
      description: "Self-taught, with powers that grew without formal training.",
      survival: "SOC 6+",
      advancement: "INT 8+",
      skills: ["Telepathy", "Telekinesis", "Deception", "Stealth", "Streetwise", "Melee or Gun Combat"],
    },
    {
      id: "adept",
      name: "Adept",
      description: "A student of the psionic disciplines.",
      survival: "EDU 4+",
      advancement: "EDU 8+",
      skills: ["Telepathy", "Clairvoyance", "Awareness", "Medic", "Persuade", "Science"],
    },
    {
      id: "psi-warrior",
      name: "Psi-Warrior",
      description: "A fighter who blends combat skill with psionic warfare.",
      survival: "END 6+",
      advancement: "END 6+",
      skills: ["Telepathy", "Awareness", "Teleportation", "Gun Combat", "Vacc Suit", "Recon"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["EDU +1", "INT +1", "STR +1", "DEX +1", "END +1", "PSI +1"] },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Telepathy", "Clairvoyance", "Telekinesis", "Awareness", "Teleportation", "Any Talent"],
    },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Language", "Art", "Electronics", "Medic", "Science", "Mechanic"],
    },
  ],
  ranks: [
    {
      assignments: ["wild-talent"],
      ranks: [
        {},
        { title: "Survivor", bonus: "Survival 1 or Streetwise 1" },
        {},
        { title: "Witch", bonus: "Deception 1" },
        {},
        {},
        {},
      ],
    },
    {
      assignments: ["adept"],
      ranks: [
        {},
        { title: "Initiate", bonus: "Science (psionicology) 1" },
        {},
        { title: "Acolyte", bonus: "Any Talent skill 1" },
        {},
        {},
        { title: "Master", bonus: "Any Talent skill 1" },
      ],
    },
    {
      assignments: ["psi-warrior"],
      ranks: [
        { title: "Psi-Soldier" },
        { bonus: "Gun Combat (any) 1" },
        { title: "Knight", bonus: "Leadership 1" },
        {},
        {},
        { title: "Master of Wills", bonus: "Tactics (any) 1" },
        {},
      ],
    },
  ],
  benefits: {
    cash: [1000, 2000, 4000, 4000, 8000, 8000, 16000],
    other: ["Gun", "2 Ship Shares", "Contact", "TAS Membership", "Contact", "Combat Implant", "10 Ship Shares"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Your mind touches something dangerous, leaving you with lasting nightmares.",
      effects: [
        { t: "gain", what: "PSI -1" },
        { t: "note", text: "Suffers persistent nightmares." },
      ],
    },
    {
      roll: 3,
      text: "Anti-psionic fanatics try to expose or harm you.",
      effects: [
        {
          t: "roll",
          dice: "1D",
          results: [
            { min: 1, max: 2, text: "Hurt in the attack.", effects: [{ t: "injury" }] },
            { min: 3, max: 4, text: "Exposed.", effects: [{ t: "gain", what: "SOC -1" }] },
            { min: 5, max: 6, effects: [] },
          ],
        },
      ],
    },
    {
      roll: 4,
      text: "You are pressed to use your powers unethically.",
      effects: [
        {
          t: "choose",
          prompt: "Go along with it?",
          options: [
            {
              label: "Accept: stay in the career and gain an Enemy",
              effects: [{ t: "associate", kind: "enemy" }, { t: "stay" }],
            },
            { label: "Refuse: leave the career", effects: [{ t: "note", text: "Refused and left the career." }] },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "An organisation experiments on you; you escape but must abandon this life.",
      effects: [{ t: "note", text: "Escaped from experimentation." }],
    },
    {
      roll: 6,
      text: "Your gift turns a friend against you.",
      effects: [{ t: "convert", from: ["ally", "contact"], to: ["enemy"] }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Your powers make people uneasy around you.",
      effects: [{ t: "convert", from: ["contact", "ally"], to: ["rival"] }],
    },
    {
      roll: 4,
      text: "Time spent mastering mind and body.",
      effects: [{ t: "gain", what: "Athletics 1, Stealth 1, Survival 1 or Art 1" }],
    },
    {
      roll: 5,
      text: "A chance to misuse your powers for advancement.",
      effects: [
        {
          t: "optional",
          prompt: "Use your powers unethically?",
          yes: [
            {
              t: "check",
              check: "PSI 8+",
              pass: [
                {
                  t: "choose",
                  options: [
                    { label: "Extra Benefit roll", effects: [{ t: "benefitRolls", n: 1 }] },
                    { label: "SOC +1", effects: [{ t: "gain", what: "SOC +1" }] },
                  ],
                },
              ],
              fail: [{ t: "gain", what: "SOC -1" }],
            },
          ],
        },
      ],
    },
    { roll: 6, text: "You make a surprising new connection.", effects: [{ t: "associate", kind: "contact" }] },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    { roll: 8, text: "Your psionic strength grows.", effects: [{ t: "gain", what: "PSI +1" }] },
    {
      roll: 9,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "anySkill" }] }],
    },
    { roll: 10, text: "Your powers turn up useful information.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 11,
      text: "You find a mentor.",
      effects: [
        { t: "associate", kind: "ally" },
        { t: "advanceDM", dm: 4 },
      ],
    },
    { roll: 12, text: "You reach a new level of discipline.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "assignment",
  assignmentChange: "newCareer",
  medical: "civil",
  pension: true,
  notes: [
    "Entry needs the referee's permission, normally through the Life Event that allows a psionic test.",
    "On testing PSI, roll for talents: PSI check with Telepathy +4, Clairvoyance +3, Telekinesis +2, Awareness +1, Teleportation +0, and DM-1 per earlier attempt. A learned talent starts at level 0.",
    "Telepathy taken as the first talent is gained without a roll.",
    "Basic training comes from the assignment's table, not the Service Skills table.",
    "Rolling a talent you lack on the Service Skills table allows another attempt to learn it.",
    "Each assignment counts as a separate career: changing assignment needs a new qualification roll.",
  ],
};
