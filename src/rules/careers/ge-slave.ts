import type { Career, TableRow } from "../types";

/**
 * Dog Soldier mishaps and events, GE pp71-72. The Dog Soldier assignment uses
 * these instead of the career's `mishaps` and `events` (which are the
 * labourer, servant and technician tables).
 */
export const geDogSoldierTables: { mishaps: TableRow[]; events: TableRow[] } = {
  mishaps: [
    {
      roll: 1,
      text: "Killed in combat, or survive badly maimed and are pulled from the front.",
      effects: [
        {
          t: "choose",
          options: [
            { label: "Die in combat", effects: [{ t: "special", key: "death" }] },
            {
              label: "Survive: three Injury rolls, then another assignment",
              effects: [
                { t: "injury" },
                { t: "injury" },
                { t: "injury" },
                { t: "special", key: "changeAssignment" },
                { t: "stay" },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 2,
      text: "Badly hurt, fitted with a combat implant and sent back.",
      effects: [{ t: "injury", mode: "worst2" }, { t: "special", key: "combatImplant" }, { t: "stay" }],
    },
    {
      roll: 3,
      text: "Judged unfit for duty and moved to other work.",
      effects: [{ t: "special", key: "changeAssignment" }, { t: "stay" }],
    },
    {
      roll: 4,
      text: "Beaten in battle, taken prisoner and then released.",
      effects: [
        { t: "injury" },
        { t: "associate", kind: "ally", note: "The foe who beat you." },
        { t: "special", key: "leaveEmpire", args: { to: "core" } },
      ],
    },
    {
      roll: 5,
      text: "Captured by a Hierate clan and later returned in a prisoner exchange.",
      effects: [
        { t: "nextTerm", career: "prisoner" },
        { t: "special", key: "returnToCareer", args: { career: "ge-slave" } },
      ],
    },
    {
      roll: 6,
      text: "Wounded, patched up with a combat implant and sent back.",
      effects: [{ t: "injury" }, { t: "special", key: "combatImplant" }, { t: "stay" }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    {
      roll: 3,
      text: "You live through a string of frontal assaults.",
      effects: [{ t: "gain", what: "Survival, Recon or Athletics" }],
    },
    {
      roll: 4,
      text: "An Old Salt teaches you the ropes.",
      effects: [{ t: "survivalDM", dm: 1, scope: "next" }, { t: "associate", kind: "ally" }],
    },
    {
      roll: 5,
      text: "Specialist gear for fighting the Hierate on a hostile world.",
      effects: [{ t: "gain", what: "Electronics, Vacc Suit or Survival" }],
    },
    {
      roll: 6,
      text: "Advanced training in a specialist field.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Your Aslan commanders reward you with a combat implant.",
      effects: [{ t: "special", key: "combatImplant" }],
    },
    {
      roll: 9,
      text: "You save an Aslan warrior's life.",
      effects: [{ t: "injury" }, { t: "associate", kind: "ally" }],
    },
    {
      roll: 10,
      text: "Another dog soldier challenges you to a duel.",
      effects: [
        {
          t: "choose",
          prompt: "Accept the duel?",
          options: [
            { label: "Refuse", effects: [{ t: "rank", delta: -1 }, { t: "gain", what: "SOC -1" }] },
            {
              label: "Accept",
              effects: [
                { t: "check", check: "Melee 8+", pass: [{ t: "advanceDM", dm: 2 }], fail: [{ t: "benefitRolls", n: "term" }] },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 11,
      text: "Your masters move you off the front line to more useful work.",
      effects: [{ t: "gain", what: "Tactics (military)" }, { t: "survivalDM", dm: 2, scope: "next" }],
    },
    {
      roll: 12,
      text: "Your unit routs, and you have a chance to slip away.",
      effects: [
        {
          t: "choose",
          prompt: "Escape and abandon your unit?",
          options: [
            {
              label: "Escape: new career outside the Empire",
              effects: [
                { t: "leave" },
                { t: "special", key: "leaveEmpire", args: { to: "core" } },
                { t: "associate", kind: "enemy", count: "1D" },
              ],
            },
            { label: "Stay: serve as a Warrior next term", effects: [{ t: "nextTerm", career: "ge-warrior" }] },
          ],
        },
      ],
    },
  ],
};

/** Slave, GE pp70-72. Human slaves of the Glorious Empire. */
export const geSlave: Career = {
  id: "ge-slave",
  name: "Slave",
  source: { book: "GE", page: 70 },
  description: "Human slaves serving the Empire as labourers, servants, technicians and dog soldiers.",
  setting: "glorious-empire",
  qualification: { check: null, restricted: "slave" },
  assignments: [
    {
      id: "labourer",
      name: "Labourer",
      description: "Hard physical work building the Empire. Needs STR and END 5+.",
      survival: "END 7+",
      advancement: "STR 6+",
      skills: ["Athletics", "Vacc Suit", "Profession", "Mechanic", "Electronics", "STR +1"],
      species: ["human"],
    },
    {
      id: "servant",
      name: "Servant",
      description: "Caretaker or steward to a noble household. Needs DEX and EDU 5+.",
      survival: "INT 6+",
      advancement: "DEX 6+",
      skills: ["Steward", "Medic", "Electronics", "Admin", "Profession (teacher)", "Steward"],
      species: ["human"],
    },
    {
      id: "technician",
      name: "Technician",
      description: "Keeps the Empire's machinery working. Needs INT and EDU 5+.",
      survival: "INT 6+",
      advancement: "EDU 6+",
      skills: ["Mechanic", "Electronics", "Engineer", "Science", "Jack-of-All-Trades", "Deception"],
      species: ["human"],
    },
    {
      id: "dog-soldier",
      name: "Dog Soldier",
      description: "Expendable shock troops at the head of the Empire's armies. Needs DEX and END 6+.",
      survival: "END 9+",
      advancement: "DEX 6+",
      skills: ["Vacc Suit", "Athletics", "Gun Combat", "Melee", "Heavy Weapons", "Survival"],
      species: ["human"],
    },
  ],
  tables: [
    { id: "personal", name: "Personal Development", kind: "personal", rows: ["STR +1", "DEX +1", "END +1", "INT +1", "Gambler", "Carouse"] },
    { id: "service", name: "Service Skills", kind: "service", rows: ["Deception", "Athletics", "Melee", "Streetwise", "Persuade", "Mechanic"] },
    {
      // Printed with the heading LABOURER, but it is a third general table
      // beside a separate Specialist: Labourer table; read as Advanced Education.
      id: "advanced",
      name: "Advanced Education",
      kind: "advanced",
      requires: { minEdu: 8 },
      rows: ["Navigation", "Electronics", "Jack-of-All-Trades", "Mechanic", "Stealth", "Profession"],
    },
  ],
  ranks: [
    {
      assignments: ["labourer", "servant", "technician"],
      ranks: [
        {},
        { bonus: "Profession 1" },
        {},
        { bonus: "Drive 1 or Vacc Suit 1" },
        {},
        { title: "Saihlea (Slave Chief)", bonus: "Leadership 1" },
        { title: "Awkhea (Landless Serf)" },
      ],
    },
    {
      assignments: ["dog-soldier"],
      ranks: [
        { title: "Fodder" },
        { title: "Chaff", bonus: "Gun Combat 1" },
        { title: "Brunt" },
        { title: "Boss", bonus: "Vacc Suit 1" },
        { title: "Fore" },
        { title: "Gunny", bonus: "END +1" },
        { title: "Old Salt" },
      ],
    },
  ],
  benefits: {
    cash: [0, 0, 250, 500, 1000, 5000, 10000],
    other: ["Blade", "END +1", "INT +1", "Gun", "Aslan Contact", "External or Aslan Ally", "Freedom"],
    dms: [{ if: "rank5", dm: 1 }],
  },
  mishaps: [
    {
      roll: 1,
      text: "Badly hurt, but put back to work next term.",
      effects: [{ t: "injury", mode: "worst2" }, { t: "stay" }],
    },
    {
      roll: 2,
      text: "A rival has you cast out of your slave community.",
      effects: [{ t: "associate", kind: "enemy" }, { t: "special", key: "changeAssignment" }, { t: "stay" }],
    },
    {
      roll: 3,
      text: "Cruel treatment or a dangerous workplace wears you down.",
      effects: [{ t: "gain", what: "END -1" }],
    },
    {
      roll: 4,
      text: "You learn of a planned slave revolt.",
      effects: [
        {
          t: "choose",
          prompt: "Betray the revolt to your masters?",
          options: [
            {
              label: "Report it",
              effects: [{ t: "promote" }, { t: "associate", kind: "enemy", note: "The revolt's leader." }, { t: "stay" }],
            },
            {
              label: "Keep silent",
              effects: [
                { t: "injury" },
                {
                  t: "choose",
                  prompt: "Where are you sent next term?",
                  options: [
                    { label: "Prisoner", effects: [{ t: "nextTerm", career: "prisoner" }] },
                    { label: "Dog Soldier", effects: [{ t: "nextTerm", career: "ge-slave", assignment: "dog-soldier" }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      roll: 5,
      text: "The Hierate captures you along with your masters.",
      effects: [
        {
          t: "check",
          check: "Stealth 8+ or Persuade 8+",
          pass: [{ t: "special", key: "leaveEmpire", args: { to: "core" } }],
          fail: [{ t: "nextTerm", career: "prisoner" }],
        },
      ],
    },
    {
      roll: 6,
      text: "Your master tires of you and sends you to the dog soldiers.",
      effects: [{ t: "nextTerm", career: "ge-slave", assignment: "dog-soldier" }],
    },
  ],
  events: [
    { roll: 2, text: "Disaster!", effects: [{ t: "mishap", eject: false }] },
    { roll: 3, text: "A chance to serve your Aslan master well.", effects: [{ t: "advanceDM", dm: 2 }] },
    { roll: 4, text: "You pick up handy skills.", effects: [{ t: "gain", what: "Jack-of-All-Trades 1" }] },
    {
      roll: 5,
      text: "You are taken from your family to another world.",
      effects: [{ t: "gain", what: "Deception 1, Mechanic 1 or Streetwise 1" }],
    },
    {
      roll: 6,
      text: "Your aptitude earns you specialist training.",
      effects: [{ t: "check", check: "EDU 8+", pass: [{ t: "improveExisting" }] }],
    },
    { roll: 7, text: "Life Event.", effects: [{ t: "lifeEvent" }] },
    {
      roll: 8,
      text: "Thieves and thugs set upon you.",
      effects: [
        {
          t: "choose",
          prompt: "Fight or flee?",
          options: [
            {
              label: "Fight",
              effects: [{ t: "check", check: "Melee 8+", pass: [{ t: "benefitRolls", n: 1 }], fail: [{ t: "benefitRolls", n: "term" }] }],
            },
            {
              label: "Flee",
              effects: [{ t: "check", check: "Stealth 8+", pass: [{ t: "benefitRolls", n: 1 }], fail: [{ t: "benefitRolls", n: "term" }] }],
            },
          ],
        },
      ],
    },
    {
      roll: 9,
      text: "An Aslan of another ahriy admires your work and acquires you.",
      effects: [{ t: "associate", kind: "contact" }, { t: "benefitDM", dm: 2 }],
    },
    {
      roll: 10,
      text: "Worship at the human shrine brings you closer to fellow slaves.",
      effects: [{ t: "associate", kind: "ally" }, { t: "gain", what: "Carouse, Art or Language" }],
    },
    {
      roll: 11,
      text: "Settling a dispute earns you respect among the slaves.",
      effects: [{ t: "gain", what: "Leadership, Admin or Diplomat" }],
    },
    { roll: 12, text: "Your clan's saihlea sees promise in you.", effects: [{ t: "promote" }] },
  ],
  basicTraining: "service",
  assignmentChange: "reroll",
  medical: "none",
  pension: false,
  notes: [
    "Human slaves only. Humans get END +1 and EDU -2, and every slave has SOC 0.",
    "Entry is automatic if the assignment's prerequisites are met: Labourer STR and END 5+; Servant DEX and EDU 5+; Technician INT and EDU 5+; Dog Soldier DEX and END 6+.",
    "The Dog Soldier assignment uses the separate Dog Soldier Mishap and Event tables (geDogSoldierTables), not this career's own.",
    "Benefit rolls get DM+1 at Rank 5+ (not expressible in benefits.dms).",
    "Life Events here use the Core Rulebook table.",
    "Freedom makes the Traveller an awkhea with SOC 2, continuing in a Core Rulebook career.",
    "Slave ranks count only among slaves.",
  ],
};
