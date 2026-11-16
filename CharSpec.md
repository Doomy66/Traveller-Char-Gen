# Traveller Character Generator: specification

The contract for the generator. Code and tests cite these clauses. Page
numbers are printed pages. CRB is the *Traveller Core Rulebook Update 2022*,
GE is *Glorious Empire*, CSC the *Central Supply Catalogue Update 2023*, HG
*High Guard Update 2022*.

## Contents

1. Purpose
2. Sources
3. The rules as data
4. The Traveller
5. The conversation: decisions, dice and undo
6. Applying the rules
7. Mustering out
8. The order of creation
9. Output
10. The application
11. Rulings and open questions
12. Crews

## 1. Purpose

1.1 Make a Traveller exactly as CRB pp8-57 does it, term by term, with every
die shown and every decision left to the player.

1.2 Make NPCs, one or a crowd, by the same rules with the choices made
sensibly for them.

1.3 Nothing is hidden in code: every table is transcribed once as data and
the engine reads it (3).

## 2. Sources

2.1 CRB pp8-57: characteristics, background skills, pre-career education,
the twelve careers, Prisoner, Life Events, benefits, ageing, injury, medical
bills, skills packages, Aslan and Vargr. CRB pp58-72 for the skill list.
CRB pp228-237 for PSI, talents and the Psion career. CRB pp97-149 for the
equipment benefits draw on; CRB pp188-227 for the ships.

2.2 GE pp56-72: the Glorious Empire careers (Fleet, Fleet Officer, Warrior,
Warrior Officer, Landless One, Slave) and the chapter's rules for Aslan and
human slaves.

2.3 CSC: augments beyond the Core list, offered for Cybernetic Implant and
Combat Implant benefits.

2.4 The repository holds none of Mongoose's prose. Table text is summarised in
our own words; numbers, names and skills are the book's.

## 3. The rules as data

3.1 `src/rules/types.ts` defines a career: qualification, commission,
assignments with survival and advancement, skill tables, rank tables, the
benefit columns, the six mishaps and eleven events, and flags for basic
training, changing assignment, medical bills and pension.

3.2 **Gain grammar.** A skill table entry, rank bonus or gain effect is text:
`Skill` (+1), `Skill (spec)`, `Skill (any)`, `Skill N` (set to N if higher),
`STAT +N`, `STAT N` (raise to at least N), `A or B`, `A, B or C`,
`A and B`, `Skill (x or y)`, `N Ship Shares`, `1D Ship Shares`,
`N Clan Shares`, `CrN`, `Any Talent`, `Any skill`, and options tagged
`[male]`, `[female]`, `[slave]`, `[aslan]`, `[human]`.

3.3 **Check grammar.** `STAT N+`, `STAT or STAT N+`, `Skill N+`,
`A N+, B N+ or C N+`, `Rite N+` and plain `N+`. The best option for the
Traveller is used. During creation a check adds only the characteristic DM or
the skill level, never both (CRB p11). An untrained skill is DM-3, less
Jack-of-all-Trades.

3.4 **Benefit grammar.** The gain grammar plus named benefits (Weapon, Gun,
Blade, Armour, Cybernetic Implant, Combat Implant, Augmentation, Scientific
Equipment, Personal Vehicle, TAS Membership, Contact, Ally, Free Trader, Lab
Ship, Yacht, Scout Ship, Ship's Boat, and GE's Brotherhood of the Empire,
Courier, Transport, External or Aslan Ally, Freedom, Secret School, Aslan
Contact).

3.5 **Effects.** Events and mishaps carry a list of effects (types.ts
`Effect`): gain, any skill, improve an existing skill, choose, optional,
check with pass, fail and natural-2 branches, a sub-roll, associates,
converting an associate, benefit DMs and rolls, advancement, qualification
and survival DMs, promotion, commission, rank change, mishap, injury, life
event, another career's table, leave, stay, must continue, a forced next
term, the war draft, a PSI test, cash, parole, failing to graduate, a note,
and named specials.

3.5.30 **Specials** are rules only one table has, each a function in
`SPECIALS` (src/engine/effects.ts): `injureAssociate`, `possession`, `distinctSpecialities`,
`injuryBest2`, `unusualEvent`, `associateIfNone`, `byAssignment`,
`skillRoll`, `gambleBenefitRolls`, `wagerBenefitRolls`, `hireLawyer`,
`tutorChallenge`, `warDraft`, and for GE `onlyLandlessOrOutlaw`,
`termsAsQualifyDM`, `combatImplant`, `setStat`, `loseAssociate`,
`leaveEmpire`, `mercenaryEvent`, `redemption`, `cashBenefitRoll`,
`changeAssignment`, `death`, `returnToCareer`.

3.6 A test parses every string in every table and checks every table has its
book shape: six-row skill tables, seven ranks, events 2 to 12, mishaps 1 to 6,
matching benefit columns, and every special defined.

## 4. The Traveller

4.1 `src/engine/character.ts` holds the Traveller as plain data:
characteristics now and as rolled, skills, careers, terms, associates, cash,
debt, shares, pension, possessions, ships, history, and the flags creation
needs (drafted, education, psionics, anagathics, ageing crisis, one-shot
DMs, a forced next term).

4.2 **Skills.** A skill with specialities is held as a general level 0 plus a
level per speciality; a skill without is a single level. Gaining a level in a
skill with specialities asks which (CRB p58). No skill passes 4 during
creation, and total skill levels may not pass 3 x (INT + EDU) (CRB p18);
an increase that would is lost and the history says why.

4.3 **Characteristics** are capped at the species' maximum (15). SOC above
the cap becomes Ship Shares (CRB p47).

## 5. The conversation: decisions, dice and undo

5.1 Creation is one async function. It stops at every decision (`Ctx.one`,
`Ctx.many`, `Ctx.number`, `Ctx.yes`) and every roll (`Ctx.roll`).

5.2 Whoever answers implements `Answerer`: the screen, the random NPC
answerer, a test. The engine offers a suggestion (`hint`) with each question,
which the automatic answerer takes. A question with one possible answer is
not asked.

5.3 Every answer and every die goes into a transcript. Replaying the
transcript rebuilds the Traveller exactly. Undo replays the transcript up to
the last decision and asks it again; dice after that decision are rolled
afresh. A saved `.traveller` file is the setup, settings, transcript and the
edits made after creation.

5.4 With manual dice on, every roll asks for the dice the player threw.

## 6. Applying the rules

6.1 A characteristic check is 2D + DM; a skill check 2D + level.

6.2 Skill table rolls: the player picks any table available (Advanced
Education needs its EDU, Officer needs a commission), rolls 1D, and applies
the row.

6.3 Effects apply in order. Mishaps eject unless they say otherwise; a
Prisoner is never ejected (CRB p52). An event that ends in an ejecting mishap
ends the term there, before advancement.

6.4 **Injury** (CRB p49): the player picks which characteristics take the
loss. Medical care is then offered: 2D + rank on the career's Medical Bills
row sets the share the employer pays, the rest at Cr5,000 a point is debt.

6.5 **Psionics** (CRB p228): PSI is 2D minus terms served, tested when an
event allows and the setting has psionics on. Talents are attempted in the
player's order with the learning DM and DM-1 per earlier attempt;
Telepathy first is automatic. A talent gained on a Psion skill table that the
Traveller lacks is a chance to learn it.

6.9 Specials: see 3.5.30.

## 7. Mustering out

7.1 Benefit rolls: one per term served without losing it, plus events, plus
1, 2 or 3 for highest rank 1-2, 3-4, 5-6 (CRB p46). Rank 5+ adds DM+1 to
every roll; GE careers add their own DMs.

7.2 The Cash column may be used three times in a life (CRB p46); a human of
the Glorious Empire once per career outside Slave (GE p57). Gambler 1+ is
DM+1 on Cash. Event DMs to one roll are spent when the player chooses.

7.3 Item benefits are chosen from the equipment lists within the book's
limits (CRB p47), or left to choose later. Each item shows the skill it is
used with and the Traveller's level in it; items the Traveller has the
skill for are listed first, best skill first, and the suggestion (which an
NPC takes) is one of them. A repeated benefit gives the
book's alternative (another item or a skill level; armour trade-up; 25% more
of a ship's mortgage; TAS twice is 2 Ship Shares; a second Scout Ship rolls
again). A ship comes with 1D quirks (CRB p188).

7.4 Pension after five or more terms in a career that pays one (CRB p48).

## 8. The order of creation

8.1 Characteristics: six 2D rolls arranged freely, in order, or typed in;
species modifiers applied (minimum 1). GE Aslan also roll TER and a rite of
passage score; a GE human slave has SOC 0.

8.2 Background skills: EDU DM + 3 at level 0 (CRB p9).

8.3 Each term, in this order: anagathics (from the fourth term); education
or career; qualification (with DM-1 per previous career, age DMs, the
graduate's bonus, one-shot DMs; automatic after academy or by the career's
own rule; failing after an ageing crisis); basic training on entering a
career (all Service Skills at 0 for the first career, one for later ones;
Citizen, Drifter and Psion from the assignment table); a pre-career
commission for graduates; the skill roll (replaced by basic training in the
first career's first term when the setting says so, CRB p18); survival (twice
on anagathics, natural 2 fails); mishap or event; commission or advancement;
the term's benefit roll; four years; ageing from the fourth term.

8.3.1 **Career choices.** Each career offered shows its qualification check,
DM and chance of success. A career no roll could qualify for (a 12 plus
the best DM still short of the target, every assignment closed, or any
check after an ageing crisis) is shown but cannot be chosen, with the
reason. If that would leave nothing to choose, everything is offered and
the dice decide.

8.4 Advancement: success raises rank, gives the rank bonus and an extra skill
roll. A total no greater than terms served in the career ends it; a natural
12 forces the Traveller to stay. A Prisoner leaves when the advancement total
beats the parole threshold.

8.5 Leaving a career: voluntarily, ejected, forced (prison, the draft, an
event) or by changing to an assignment that counts as a new career. A
Traveller may not re-enter the career they just left (the Drifter excepted).
Failing qualification gives the draft (once) or the Drifter; in the Glorious
Empire an Aslan gets one more try at DM-1, then Landless One with SOC 0.

8.6 University and the academies (CRB pp16-17): entry, skills, pre-career
event, graduation and honours, and their benefits on entering a career.

8.7 Finishing: muster out of any current career; the group's skills package,
the player's share of it at level 1; up to two connection skills (none above
3, no Jack-of-all-Trades); psionic institute training if tested and willing;
debts paid out of cash.

## 9. Output

9.1 The sheet: name, noble title, species, age, homeworld, UPP,
characteristics and DMs, skills with the total against the cap, careers with
ranks and titles, finances, ships with mortgage and quirks, equipment,
associates, traits and wounds, goal, notes and history.

9.2 Text, Markdown and (for a crowd) CSV exports; print turns the sheet light
and drops everything else.

## 10. The application

10.1 A landing in the style of the sibling applications; a setup form; the
conversation and sheet side by side; the finished screen with the
Cr10,000 starting equipment shop; quick NPCs and crowds; a rules browser over
the data.

10.1.1 The shop shows each item's skill (a weapon's or vehicle's skill, or
armour's "Requires Vacc Suit N") with the Traveller's level in it, and can
list only the items the Traveller has the skill for. Gear the lists give no
skill is left out of that list.

10.2 The session saves itself in the browser and can be resumed; a
`.traveller` file can be saved and opened.

## 11. Rulings and open questions

11.1 **Basic training and the first skill roll.** CRB p18 says basic training
is "instead of rolling for a skill". The setting defaults to that reading and
can be switched off.

11.2 **Rite of passage.** GE careers qualify on "Rite N+", which Aliens of
Charted Space Vol. 1 defines. Without that book the generator rolls 2D once
as the rite score and uses its characteristic DM. Clan, TER and Ancestral
Deeds tables are not modelled.

11.3 **Aslan Life Events.** GE points to The Trojan Reach's Aslan Life Events
table; the Core table is used.

11.4 **Mishap after an event.** When an event's failure sends the Traveller to
the Mishap table, the mishap ejects as a survival failure would, and the term
ends before advancement.

11.5 **Ageing crisis.** The care is always paid, as debt if need be, so the
Traveller lives; every later qualification fails.

11.6 **Equipment.** Weapons are not split into common and military in the
Core lists, so Gun and Weapon benefits offer every weapon within the limit.

11.7 **Death.** Core creation has no death. The only death is the Dog Soldier
mishap that offers it as a choice.

11.8 **A captain's skill.** The Crew Requirements table gives a captain no
skill. The crew roller takes Leadership, Tactics (naval), Broker or Admin,
or whichever one of them the user insists on. Tactics (naval) is the
speciality for commanding a ship in battle (CRB p72); Tactics (military)
is for ground forces, so it does not count.

## 12. Crews

12.1 **Posts.** `src/rules/crew.ts` holds the crew posts of HG pp23-24 (the
table CRB p182 gives in part): captain, pilot, small craft pilot, astrogator,
engineer, maintenance, gunner, sensor operator, steward, medic, administrator
and officer, plus the marine of CRB p154. Each names the skills that fill it
(any one will do), its monthly salary at skill 1, and the careers and
assignments that teach it. A post may offer narrower skills to insist on
instead: the marine can ask for one Gun Combat speciality, the gunner for
one Gunner speciality, the engineer for one Engineer speciality (life
support included, though the post otherwise wants j-drive, m-drive or
power), and the captain for one of Leadership, Tactics (naval), Broker or Admin. Such a post
can take more than one row, each with its own count, option and level, so
a crew can have, say, one j-drive and one power engineer.

12.2 **Salary** is the table's figure at level 1, half as much again for each
level above (HG p23). Below level 1 it is the table's figure.

12.1.1 **Posts from the High Guard ship sheets.** Scientist (Science, on a
laboratory ship, HG p61), Small craft crew (Pilot (small craft) or Gunner
(turret), for the craft and fighters a ship carries), and three posts for
one person doing two jobs: Pilot/Astrogator, Astrogator/Engineer and
Captain/Pilot. A two-job post needs both skills at the level asked for and
pays the higher of the two salaries. The crew table gives Scientist and
Small craft crew no salary, shown as a dash.

12.3 **Starting points.** The crew line of each Core ship (CRB pp190-216), or
any ship the Traveller Ship Designer comes with (12.8), can be loaded as the
counts.

12.4 **Filling a post.** An NPC is rolled by the ordinary rules (8) with an
answerer that makes the choices someone after the job would make: the
careers and assignments listed for the post, the skill tables and
specialities that hold its skill, staying in a career until the skill is at
the level asked for, then leaving after two to four terms, and never serving
more than seven. The dice are never touched. The first NPC at the level fills
the post; after 40 tries the best of them does, marked as short.

12.4.1 Each visit to the crew screen starts afresh (a Free Trader's crew,
any skill, level 1, no service); nothing is remembered between visits.

12.5 **Output.** The crew table shows each post's NPC, their level in the
post's skill, salary, careers and the other posts they could fill at level 1,
with the month's payroll. Any one post can be rerolled. CSV, Markdown and
text exports carry the post, skill and salary with each sheet.

12.6 **A service's crew.** A crew may be for one service: the Navy, Marines,
Scout Service, Army or Merchant, or in the Glorious Empire the Aslan Fleet
or Aslan Warriors. Every member must then end creation serving in it (their
last career is the service's), so holds its rank, which the crew table
shows. On a Navy or Fleet ship the Marine post comes from the Marines or
the Warriors. Captains and officers must be commissioned, or in the
Glorious Empire come from the Fleet Officer or Warrior Officer career. The
answerer steers into the service and keeps the NPC in it until the skill
and rank are there; serving matters more than skill level when the best of
40 NPCs has to be settled for.

12.6.1 **Once in, that's it.** A service crew member may have had careers
before joining, but once in the service nothing else follows: leaving it,
by choice or thrown out by a mishap, ends creation, with no return. The one
move allowed is on to another of the service's own careers not yet served
in, such as Aslan Fleet to Fleet Officer; an NPC who has any other career
after joining (a failed move, a forced term) is unfit and another is rolled.
A service crew member leaves creation one to three terms in (others two to
four) once the job and rank are theirs, and one who only qualified by
serving all seven terms is held back while up to ten more NPCs are tried,
the youngest qualified being taken. Navy crews average about 28 rather than
35. With the species left mixed, a service crew is drawn from those who
can serve: the Aslan services take Aslan only, not human slaves.

12.7 **A minimum rank.** Each row may ask for a lowest rank in the service,
on the post's own ladder: officer ranks (O1 to O6) for commissioned posts,
enlisted ranks for the rest, so an enlisted post asking for a rank is not
filled by an officer. The ranks are labelled with the service's own titles.

12.8 **Ships from the Traveller Ship Designer.** The designer's own engine
(its sheet() and its .ship reader) is bundled into `src/vendor` by
`scripts/vendor-ship-designer.mjs`, which also writes the crew of every ship
the designer comes with (its four High Guard fixtures and its catalogue)
into `src/rules/ship-designs.json`. A `.ship` file saved by the designer can
be opened on the crew screen: its crew comes from the same engine, so it
matches the designer's sheet exactly. Its crew roles map one to one onto the
posts; it has no marines, scientists or small craft crews of its own.

