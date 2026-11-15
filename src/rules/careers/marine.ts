import type { Career } from "../types";

/** Marine, CRB pp32-33. */
export const marine: Career = {
  id: "marine",
  name: "Marine",
  source: { book: "CRB", page: 32 },
  description: "Shipboard troops who fight boarders, defend naval bases and spearhead planetary landings.",
  setting: "core",
  qualification: { check: "END 6+", perPreviousCareer: -1, age: { age: 30, dm: -2 } },
  commission: "SOC 8+",
  assignments: [
    {
      id: "support",
      name: "Support",
      description: "A quartermaster, engineer or combat medic serving with the marines.",
      survival: "END 5+",
      advancement: "EDU 7+",
      skills: ["Electronics", "Mechanic", "Drive or Flyer", "Medic", "Heavy Weapons", "Gun Combat"],
    },
    {
      id: "star-marine",
      name: "Star Marine",
      description: "A shipboard trooper trained for boarding actions.",
      survival: "END 6+",
      advancement: "EDU 6+",
      skills: ["Vacc Suit", "Athletics", "Gunner", "Melee (blade)", "Electronics", "Gun Combat"],
    },
    {
      id: "ground-assault",
      name: "Ground Assault",
      description: "Dropped from orbit to seize a planetary target.",
      survival: "END 7+",
      advancement: "EDU 5+",
      skills: ["Vacc Suit", "Heavy Weapons", "Recon", "Melee (blade)", "Tactics (military)", "Gun Combat"],
    },
  ],
  tables: [
    {
      id: "personal",
      name: "Personal Development",
      kind: "personal",
      rows: ["STR +1", "DEX +1", "END +1", "Gambler", "Melee (unarmed)", "Melee (blade)"],
    },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Athletics", "Vacc Suit", "Tactics", "Heavy Weapons", "Gun Combat", "Stealth"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Medic", "Survival", "Explosives", "Engineer", "Pilot", "Navigation"],
    },
    {
      id: "officer",
      name: "Officer",
      kind: "officer",
      requires: { commissioned: true },
      rows: ["Electronics", "Tactics", "Admin", "Advocate", "Diplomat", "Leadership"],
    },
  ],
  ranks: [
    {
      assignments: "all",
      ranks: [
        { title: "Marine", bonus: "Gun Combat (any) 1 or Melee (blade) 1" },
        { title: "Lance Corporal", bonus: "Gun Combat (any) 1" },
        { title: "Corporal" },
        { title: "Lance Sergeant", bonus: "Leadership 1" },
        { title: "Sergeant" },
        { title: "Gunnery Sergeant", bonus: "END +1" },
        { title: "Sergeant Major" },
      ],
    },
    {
      assignments: "all",
      officer: true,
      ranks: [
        {},
        { title: "Lieutenant", bonus: "Leadership 1" },
        { title: "Captain" },
        { title: "Force Commander", bonus: "Tactics 1" },
        { title: "Lieutenant Colonel" },
        { title: "Colonel", bonus: "SOC 10 or SOC +1" },
        { title: "Brigadier" },
      ],
    },
  ],
  benefits: {
    cash: [2000, 5000, 5000, 10000, 20000, 30000, 40000],
    other: ["Armour", "INT +1", "EDU +1", "Weapon", "TAS Membership", "Armour or END +1", "SOC +2"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Badly wounded in combat.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Captured and abused on a failed mission; your wounds end your service.",
      effects: [
        { t: "associate", kind: "enemy", note: "your jailer" },
        { t: "gain", what: "STR -1 and DEX -1" },
      ],
    },
    {
      roll: 3,
      text: "Left stranded behind enemy lines after a failed mission.",
      effects: [{ t: "gain", what: "Stealth or Survival" }],
    },
    {
      roll: 4,
      text: "Ordered on a covert mission you find morally repugnant.",
      effects: [
        {
          t: "choose",
          prompt: "Take part in the mission?",
          options: [
            { label: "Refuse: leave the service", effects: [{ t: "note", text: "Refused an unconscionable order and was thrown out." }] },
            {
              label: "Accept: stay in the marines",
              effects: [
                { t: "stay" },
                { t: "associate", kind: "enemy", note: "the lone survivor" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "A feud with an officer or comrade drives you out of the corps.",
      effects: [{ t: "associate", kind: "rival" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Cut off behind enemy lines, you must fend for yourself.",
      effects: [{ t: "gain", what: "Survival 1, Stealth 1, Deception 1 or Streetwise 1" }],
    },
    {
      roll: 4,
      text: "Posted to a space station's security detail.",
      effects: [{ t: "gain", what: "Vacc Suit or Athletics (dexterity)" }],
    },
    {
      roll: 5,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "anySkill", level: 1 }] }],
    },
    {
      roll: 6,
      text: "You join the storming of an enemy stronghold.",
      effects: [
        {
          t: "check",
          check: "Melee 8+ or Gun Combat 8+",
          pass: [{ t: "gain", what: "Tactics (military) or Leadership" }],
          fail: [
            { t: "note", text: "Wounded in the assault." },
            { t: "gain", what: "STR -1, DEX -1 or END -1" },
          ],
        },
      ],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You fight in the invasion and occupation of a world.",
      effects: [{ t: "gain", what: "Recon 1, Gun Combat 1, Leadership 1 or Electronics (comms) 1" }],
    },
    {
      roll: 9,
      text: "Your commander's blunder wrecks a mission, but you live through it.",
      effects: [
        {
          t: "choose",
          prompt: "Report your commander?",
          options: [
            {
              label: "Report them",
              effects: [
                { t: "advanceDM", dm: 2 },
                { t: "associate", kind: "enemy", note: "the officer you reported" },
              ],
            },
            { label: "Cover for them", effects: [{ t: "associate", kind: "ally", note: "the officer you protected" }] },
          ],
        },
      ],
    },
    { roll: 10, text: "Sent on a covert operation.", effects: [{ t: "advanceDM", dm: 2 }] },
    {
      roll: 11,
      text: "Your commanding officer takes an interest in you.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Tactics 1", effects: [{ t: "gain", what: "Tactics 1" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "You show great courage under fire.", effects: [{ t: "promoteOrCommission" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
};
