import type { Career } from "../types";

/** Merchant, CRB pp34-35. */
export const merchant: Career = {
  id: "merchant",
  name: "Merchant",
  source: { book: "CRB", page: 34 },
  description: "Traders and spacers, from megacorporate freighter crews to independent tramp traders.",
  setting: "core",
  qualification: { check: "INT 4+", perPreviousCareer: -1 },
  assignments: [
    {
      id: "merchant-marine",
      name: "Merchant Marine",
      description: "Crew on a huge corporate or government cargo hauler.",
      survival: "EDU 5+",
      advancement: "INT 7+",
      skills: ["Pilot", "Vacc Suit", "Athletics", "Mechanic", "Engineer", "Electronics"],
    },
    {
      id: "free-trader",
      name: "Free Trader",
      description: "Crew aboard a small independent trading ship.",
      survival: "DEX 6+",
      advancement: "INT 6+",
      skills: ["Pilot (spacecraft)", "Vacc Suit", "Deception", "Mechanic", "Streetwise", "Gunner"],
    },
    {
      id: "broker",
      name: "Broker",
      description: "A dealer working out of a starport or planetside trading house.",
      survival: "EDU 5+",
      advancement: "INT 7+",
      skills: ["Admin", "Advocate", "Broker", "Streetwise", "Deception", "Persuade"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "INT +1", "Language", "Streetwise"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Drive", "Vacc Suit", "Broker", "Steward", "Electronics", "Persuade"] },
    {
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Engineer", "Astrogation", "Electronics", "Pilot", "Admin", "Advocate"],
    },
  ],
  ranks: [
    {
      assignments: ["merchant-marine"],
      ranks: [
        { title: "Crewman" },
        { title: "Senior Crewman", bonus: "Mechanic 1" },
        { title: "4th Officer" },
        { title: "3rd Officer" },
        { title: "2nd Officer", bonus: "Pilot 1" },
        { title: "1st Officer", bonus: "SOC +1" },
        { title: "Captain" },
      ],
    },
    {
      assignments: ["free-trader"],
      ranks: [
        {},
        { bonus: "Persuade 1" },
        {},
        { title: "Experienced Trader", bonus: "Jack-of-all-Trades 1" },
        {},
        {},
        {},
      ],
    },
    {
      assignments: ["broker"],
      ranks: [
        {},
        { bonus: "Broker 1" },
        {},
        { title: "Experienced Broker", bonus: "Streetwise 1" },
        {},
        {},
        {},
      ],
    },
  ],
  benefits: {
    cash: [1000, 5000, 10000, 20000, 20000, 40000, 40000],
    other: ["Blade", "INT +1", "EDU +1", "Gun", "Ship Share", "Free Trader", "Free Trader"],
  },
  mishaps: [
    {
      roll: 1,
      text: "Severely injured.",
      effects: [{ t: "injury", mode: "severe" }],
    },
    {
      roll: 2,
      text: "A competitor ruins you financially.",
      effects: [
        { t: "benefitRolls", n: "career" },
        { t: "associate", kind: "rival", note: "the trader who ruined you" },
      ],
    },
    {
      roll: 3,
      text: "War wipes out your trade routes and you flee the region.",
      effects: [{ t: "gain", what: "Gun Combat 1 or Pilot 1" }],
    },
    {
      roll: 4,
      text: "Criminals destroy your ship or starport.",
      effects: [{ t: "associate", kind: "enemy", note: "the criminals responsible" }],
    },
    {
      roll: 5,
      text: "Government trade restrictions shut your business down.",
      effects: [
        {
          t: "optional",
          prompt: "Enter the Rogue career next term without a qualification roll?",
          yes: [{ t: "nextTerm", career: "rogue" }],
        },
      ],
    },
    {
      roll: 6,
      text: "Poor decisions bankrupt you, but you rescue something from the wreck.",
      effects: [{ t: "keepBenefit" }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You are asked to smuggle contraband onto a world.",
      effects: [
        {
          t: "optional",
          prompt: "Agree to smuggle the goods?",
          yes: [
            {
              t: "check",
              check: "Deception 8+ or Persuade 8+",
              pass: [
                { t: "gain", what: "Streetwise 1" },
                { t: "benefitRolls", n: 1 },
              ],
            },
          ],
          no: [{ t: "associate", kind: "enemy", note: "a criminal" }],
        },
      ],
    },
    {
      roll: 4,
      text: "Dealing with suppliers and spacers broadens your skills.",
      effects: [{ t: "gain", what: "Profession 1, Electronics 1, Engineer 1, Animals 1 or Science 1" }],
    },
    {
      roll: 5,
      text: "A risky deal could pay off handsomely.",
      effects: [
        {
          t: "optional",
          prompt: "Gamble some of your Benefit rolls on the deal?",
          yes: [{ t: "special", key: "gambleBenefitRolls", args: { checks: ["Gambler 8+", "Broker 8+"] } }],
        },
      ],
    },
    { roll: 6, text: "You make a contact outside your usual circles.", effects: [{ t: "associate", kind: "contact" }] },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "You get caught up in legal trouble.",
      effects: [
        { t: "gain", what: "Advocate 1, Admin 1, Diplomat 1 or Investigate 1" },
        {
          t: "roll",
          dice: "2D",
          results: [
            { min: 2, max: 2, text: "Convicted.", effects: [{ t: "nextTerm", career: "prisoner" }] },
            { min: 3, max: 12, effects: [] },
          ],
        },
      ],
    },
    {
      roll: 9,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 10, text: "A lucrative deal lets you live well for a while.", effects: [{ t: "benefitDM", dm: 1 }] },
    {
      roll: 11,
      text: "You make a useful friend.",
      effects: [
        { t: "associate", kind: "ally" },
        {
          t: "choose",
          options: [
            { label: "Carouse +1", effects: [{ t: "gain", what: "Carouse" }] },
            { label: "DM+4 to an advancement roll", effects: [{ t: "advanceDM", dm: 4 }] },
          ],
        },
      ],
    },
    { roll: 12, text: "Your business or ship prospers.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "newCareer",
  medical: "civil",
  pension: true,
};
