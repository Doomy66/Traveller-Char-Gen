import type { Career } from "../types";

/** Army, CRB pp24-25. */
export const army: Career = {
  id: "army",
  name: "Army",
  source: { book: "CRB", page: 24 },
  description: "Planetary ground forces and mercenaries who fight surface battles and campaigns.",
  setting: "core",
  qualification: { check: "END 5+", perPreviousCareer: -1, age: { age: 30, dm: -2 } },
  commission: "SOC 8+",
  assignments: [
    {
      id: "support",
      name: "Support",
      description: "An engineer, cook or other rear-echelon role.",
      survival: "END 5+",
      advancement: "EDU 7+",
      skills: ["Mechanic", "Drive or Flyer", "Profession", "Explosives", "Electronics (comms)", "Medic"],
    },
    {
      id: "infantry",
      name: "Infantry",
      description: "A foot soldier on the front line.",
      survival: "STR 6+",
      advancement: "EDU 6+",
      skills: ["Gun Combat", "Melee", "Heavy Weapons", "Stealth", "Athletics", "Recon"],
    },
    {
      id: "cavalry",
      name: "Cavalry",
      description: "Crew of a tank or gunship.",
      survival: "DEX 7+",
      advancement: "INT 5+",
      skills: ["Mechanic", "Drive", "Flyer", "Recon", "Heavy Weapons (vehicle)", "Electronics (sensors)"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "Gambler", "Medic", "Melee"] },
    {
      id: "service",
      name: "Service Skills",
      kind: "service",
      rows: ["Drive or Vacc Suit", "Athletics", "Gun Combat", "Recon", "Melee", "Heavy Weapons"],
    },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Tactics (military)", "Electronics", "Navigation", "Explosives", "Engineer", "Survival"],
    },
    {
      id: "officer",
      name: "Officer",
      kind: "officer",
      requires: { commissioned: true },
      rows: ["Tactics (military)", "Leadership", "Advocate", "Diplomat", "Electronics", "Admin"],
    },
  ],
  ranks: [
    {
      assignments: "all",
      ranks: [
        { title: "Private", bonus: "Gun Combat 1" },
        { title: "Lance Corporal", bonus: "Recon 1" },
        { title: "Corporal" },
        { title: "Lance Sergeant", bonus: "Leadership 1" },
        { title: "Sergeant" },
        { title: "Gunnery Sergeant" },
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
        { title: "Major", bonus: "Tactics (military) 1" },
        { title: "Lieutenant Colonel" },
        { title: "Colonel" },
        { title: "General", bonus: "SOC 10 or SOC +1" },
      ],
    },
  ],
  benefits: {
    cash: [2000, 5000, 10000, 10000, 10000, 20000, 30000],
    other: [
      "Cybernetic Implant",
      "INT +1",
      "EDU +1",
      "Weapon",
      "Armour",
      "END +1 or Cybernetic Implant",
      "SOC +1",
    ],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured in action.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "Your unit is wiped out in a disastrous battle; you blame your commander, who has you thrown out.",
      effects: [{ t: "associate", kind: "enemy", note: "Your former commander." }],
    },
    {
      roll: 3,
      text: "A grim campaign against rebels in hostile terrain ends with a quiet discharge.",
      effects: [
        { t: "gain", what: "Recon or Survival" },
        { t: "associate", kind: "enemy", note: "The rebels." },
      ],
    },
    {
      roll: 4,
      text: "You find your commanding officer running an illegal racket.",
      effects: [
        {
          t: "choose",
          prompt: "Join the racket or co-operate with the military police?",
          options: [
            {
              label: "Join the ring: gain the officer as an Ally",
              effects: [{ t: "associate", kind: "ally", note: "Your corrupt commanding officer." }],
            },
            { label: "Co-operate: keep this term's Benefit roll", effects: [{ t: "keepBenefit" }] },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "A feud with an officer or fellow soldier drives you out of the service.",
      effects: [{ t: "associate", kind: "rival" }],
    },
    { roll: 6, text: "Injured.", effects: [{ t: "injury" }] },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "Posted to a world with a wild or hostile environment.",
      effects: [{ t: "gain", what: "Vacc Suit 1, Engineer 1, Animals (riding or training) 1 or Recon 1" }],
    },
    {
      roll: 4,
      text: "Posted to a war-torn urban world.",
      effects: [{ t: "gain", what: "Stealth 1, Streetwise 1, Persuade 1 or Recon 1" }],
    },
    { roll: 5, text: "Given a special duty within your unit.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 6,
      text: "Thrown into a savage ground war.",
      effects: [
        {
          t: "check",
          check: "EDU 8+",
          pass: [{ t: "gain", what: "Gun Combat or Leadership" }],
          fail: [{ t: "injury" }],
        },
      ],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 9, text: "Cut off and outnumbered, you hold the line until relieved.", effects: [{ t: "advanceDM", dm: 2 }] },
    {
      roll: 10,
      text: "Assigned to peacekeeping duty.",
      effects: [{ t: "gain", what: "Admin 1, Investigate 1, Deception 1 or Recon 1" }],
    },
    {
      roll: 11,
      text: "Your commanding officer takes an interest in you.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Tactics (military) 1", effects: [{ t: "gain", what: "Tactics (military) 1" }] },
            { label: "DM+4 to your next advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "Heroism in battle.", effects: [{ t: "promoteOrCommission" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "military",
  pension: true,
  military: true,
};
