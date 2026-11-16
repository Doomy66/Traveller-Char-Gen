# Traveller Character Generator

Makes a Traveller to Mongoose *Traveller*'s **Core Rulebook Update 2022**,
term by term, the way the book does it: every die shown, every choice yours,
and undo one decision at a time. It also rolls NPCs, one or a crowd, with
the choices made for them.

It runs in the browser, keeps nothing on a server and sends nothing anywhere.
A Traveller saves as a `.traveller` file on your own machine, and a
character exported from Foundry VTT's Mongoose Traveller 2e system can be
opened too.

## Claude

I have 50 years of hand coding, I even reproduced the Spinward Marches on my
ZX-Spectrum, so I have earned the right and have the skills to use AI. At time
of writing, this is 100% Claude generated to my exacting requirements.

## What it does

- **The whole of Traveller creation.** Characteristics rolled and arranged,
  in order, or typed in; background skills; university and the Army, Marine
  and Naval academies with their events, graduation and honours; the twelve
  careers and their thirty-six assignments; the Prisoner and Psion careers;
  the draft and the Drifter.
- **Every table.** Each career's skill tables, ranks and bonuses, cash and
  benefits, six mishaps and eleven events, the Life Events and Pre-career
  Events tables, injury, medical bills, ageing and the ageing crisis,
  anagathics, commissions, the advancement and ejection rules, changing
  assignment, pensions, parole thresholds, skills packages and the
  connections rule.
- **Psionics**: PSI testing, talents and the Psion career, if your referee
  allows them.
- **Aslan and Vargr** as the Core Rulebook has them, and the **Glorious
  Empire**: its Aslan careers, human slaves and dog soldiers.
- **Mustering out** from real equipment lists: pick the gun, armour, blade,
  implant, vehicle or ship a benefit gives you, within the book's limits.
  Ships come with their quirks and mortgages.
- **Starting equipment**: spend up to Cr10,000 from a list of three hundred
  items.
- **A ship's crew**: say how many pilots, astrogators, engineers, gunners,
  stewards, medics and the rest you need, and the skill level, or start from
  any Core ship's crew line. Each post gets an NPC rolled by the ordinary
  rules, steered towards the careers that teach the job, with salary and the
  month's payroll. For a Navy, Scout, Army, Marine or merchant line ship,
  pick the service and every member is serving in it, with their rank.
  Start from a Core ship, any ship in the
  [Traveller Ship Designer](https://github.com/Doomy66/Traveller-Ship-Design),
  or a `.ship` file saved by it.
- **The sheet** redrawn after every roll, printable, and exported as text or
  Markdown. NPC crowds export as CSV.
- **A rules browser** showing every table as the generator reads it.
- **Foundry VTT import**: open a character exported from Foundry's Mongoose
  Traveller 2e system and get a finished sheet to print, export or save.

## Where the numbers come from

[CharSpec.md](CharSpec.md) is the contract. Every table is transcribed once
under [src/rules/](src/rules/), each with the page it came from, and the
engine reads them rather than restating them. Events and mishaps are written
as data too (a small language of effects), and a test parses every entry of
every table. The places where the book needs a ruling are in CharSpec 11.

## Running it

```
npm install
npm run dev
```

`npm test` runs the suite, which includes rolling several hundred Travellers
of every species to the end. `npm run build` typechecks and bundles.
`npx vite-node scripts/sample.ts 7` prints one random Traveller's history;
`npx vite-node scripts/crew-stats.ts 100 core 1` shows how often a steered NPC
reaches each crew post's skill, and `scripts/crew-service-stats.ts navy` how
many NPCs it takes to fill each post in a service.

## What it is not

An unofficial fan tool. *Traveller* is a trade mark of Mongoose Publishing and
the rules are their copyright; this repository contains none of their text.
Event descriptions are short summaries in our own words. You need your own
copy of the Core Rulebook.

The code is under the [PolyForm Noncommercial License](LICENSE.md): use it and
change it freely for anything that is not commercial, and do not sell it.
