import type { Source } from "./types";

/**
 * Equipment data: Traveller Core Rulebook Update 2022 (equipment chapter,
 * vehicles chapter, common spacecraft and small craft) plus the extra
 * augments from the Central Supply Catalogue Update 2023.
 * Pages are printed page numbers.
 */

export type ItemCategory =
  | "armour"
  | "augment"
  | "blade"
  | "melee"
  | "gun"
  | "heavy"
  | "grenade"
  | "vehicle"
  | "science"
  | "toolkit"
  | "survival"
  | "medical"
  | "computer"
  | "comms"
  | "sensor"
  | "drug"
  | "other";

export interface Item {
  id: string; // kebab-case unique
  name: string;
  category: ItemCategory;
  tl: number;
  cost: number; // Credits
  kg?: number;
  /** Compact stats line, e.g. "Protection +5, Rad 10" or "Range 25m, Dmg 3D-3, Mag 15 (Cr10), Auto 2" or "Speed High, Range 1000km, Crew 1, Pass 3" */
  stats?: string;
  /** Skill used, for weapons/vehicles: "Gun Combat (slug)", "Melee (blade)", "Flyer (grav)", "Drive (wheel)". */
  skill?: string;
  /** Weapons: "common" | "military" class if the book distinguishes; vehicles: armed true/false */
  military?: boolean;
  armed?: boolean;
  source: Source; // { book: "CRB", page: printed page }
}

const crb = (page: number): Source => ({ book: "CRB", page });
const csc = (page: number): Source => ({ book: "CSC", page });

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function armour(
  id: string,
  name: string,
  tl: number,
  protection: string,
  rad: number | null,
  kg: number,
  cost: number,
  req: string | null,
  page = 100,
): Item {
  const parts = [`Protection ${protection}`];
  if (rad !== null) parts.push(`Rad ${rad}`);
  if (req) parts.push(`Requires ${req}`);
  return { id, name, category: "armour", tl, cost, kg, stats: parts.join(", "), source: crb(page) };
}

function weapon(
  id: string,
  name: string,
  category: ItemCategory,
  skill: string,
  tl: number,
  range: string,
  dmg: string,
  kg: number | undefined,
  cost: number,
  mag: string | null,
  magCost: string | null,
  traits: string | null,
  page: number,
): Item {
  const parts = [`Range ${range}`, `Dmg ${dmg}`];
  if (mag) parts.push(magCost ? `Mag ${mag} (${magCost})` : `Mag ${mag}`);
  if (traits) parts.push(traits);
  const item: Item = { id, name, category, tl, cost, stats: parts.join(", "), skill, source: crb(page) };
  if (kg !== undefined) item.kg = kg;
  return item;
}

function vehicle(
  id: string,
  name: string,
  tl: number,
  skill: string,
  agility: string,
  speed: string,
  range: string,
  crew: number,
  pass: number,
  cargo: string,
  hull: number,
  armourStr: string,
  shipping: string,
  cost: number,
  armed: boolean,
  page: number,
  extra?: string,
): Item {
  const parts = [
    `Agility ${agility}`,
    `Speed ${speed}`,
    `Range ${range}`,
    `Crew ${crew}`,
    `Pass ${pass}`,
    `Cargo ${cargo}`,
    `Hull ${hull}`,
    `Armour ${armourStr}`,
    `Shipping ${shipping}`,
  ];
  if (extra) parts.push(extra);
  return { id, name, category: "vehicle", tl, cost, stats: parts.join(", "), skill, armed, source: crb(page) };
}

function simple(
  id: string,
  name: string,
  category: ItemCategory,
  tl: number,
  cost: number,
  kg: number | undefined,
  stats: string | undefined,
  source: Source,
): Item {
  const item: Item = { id, name, category, tl, cost, source };
  if (kg !== undefined) item.kg = kg;
  if (stats) item.stats = stats;
  return item;
}

const SLUG = "Gun Combat (slug)";
const ENERGY = "Gun Combat (energy)";
const HWP = "Heavy Weapons (portable)";
const HWV = "Heavy Weapons (vehicle)";
const BLADE = "Melee (blade)";
const BLUDGEON = "Melee (bludgeon)";

/* ------------------------------------------------------------------ */
/* Items                                                               */
/* ------------------------------------------------------------------ */

export const ITEMS: Item[] = [
  /* ---------------- Armour (CRB p100) ---------------- */
  armour("jack", "Jack", 1, "+1", null, 2, 50, null),
  armour("mesh", "Mesh", 6, "+2", null, 3, 150, null),
  armour("cloth-tl7", "Cloth (TL7)", 7, "+5", null, 7, 250, null),
  armour("cloth-tl10", "Cloth (TL10)", 10, "+8", null, 3, 500, null),
  armour("flak-jacket-tl7", "Flak Jacket (TL7)", 7, "+3", null, 8, 100, null),
  armour("flak-jacket-tl8", "Flak Jacket (TL8)", 8, "+5", null, 6, 300, null),
  armour("reflec", "Reflec", 10, "+10 (vs. lasers only)", null, 1, 1500, null),
  armour("ablat", "Ablat", 9, "+1 (+6 vs. lasers only)", null, 2, 75, null),
  armour("combat-armour-tl10", "Combat Armour (TL10)", 10, "+13", 85, 20, 96000, "Vacc Suit 1"),
  armour("combat-armour-tl12", "Combat Armour (TL12)", 12, "+17", 145, 16, 88000, "Vacc Suit 0"),
  armour("combat-armour-tl14", "Combat Armour (TL14)", 14, "+19", 180, 12, 160000, "Vacc Suit 0"),
  armour("vacc-suit-tl8", "Vacc Suit (TL8)", 8, "+4", 15, 28, 12000, "Vacc Suit 1"),
  armour("vacc-suit-tl10", "Vacc Suit (TL10)", 10, "+8", 60, 12, 10000, "Vacc Suit 0"),
  armour("vacc-suit-tl12", "Vacc Suit (TL12)", 12, "+10", 90, 8, 20000, "Vacc Suit 0"),
  armour("hostile-environment-vacc-suit-tl9", "Hostile Environment Vacc Suit (TL9)", 9, "+8", 75, 40, 24000, "Vacc Suit 1"),
  armour("hostile-environment-vacc-suit-tl10", "Hostile Environment Vacc Suit (TL10)", 10, "+9", 90, 30, 20000, "Vacc Suit 1"),
  armour("hostile-environment-vacc-suit-tl13", "Hostile Environment Vacc Suit (TL13)", 13, "+14", 170, 20, 40000, "Vacc Suit 0"),
  armour("hostile-environment-vacc-suit-tl14", "Hostile Environment Vacc Suit (TL14)", 14, "+15", 185, 10, 60000, "Vacc Suit 0"),
  {
    ...armour("battle-dress-tl13", "Battle Dress (TL13)", 13, "+22", 245, 100, 200000, "Vacc Suit 2"),
    stats: "Protection +22, Rad 245, Requires Vacc Suit 2, STR/DEX +4, Computer/2 (powered, weightless when worn)",
  },
  {
    ...armour("battle-dress-tl14", "Battle Dress (TL14)", 14, "+25", 290, 100, 220000, "Vacc Suit 1"),
    stats: "Protection +25, Rad 290, Requires Vacc Suit 1, STR +6, DEX +4, Computer/3 (powered, weightless when worn)",
  },

  /* ---------------- Armour options (CRB p102, p104) ---------------- */
  simple("chameleon-ir", "Chameleon, IR", "other", 12, 5000, undefined, "Armour option: DM-4 to detect by IR sensors", crb(102)),
  simple("chameleon-vislight", "Chameleon, Vislight", "other", 13, 50000, undefined, "Armour option: DM-4 to spot visually", crb(102)),
  simple("computer-weave-tl10", "Computer Weave (TL10)", "other", 10, 500, undefined, "Armour option: Computer/0", crb(104)),
  simple("computer-weave-tl11", "Computer Weave (TL11)", "other", 11, 1000, undefined, "Armour option: Computer/1", crb(104)),
  simple("computer-weave-tl13", "Computer Weave (TL13)", "other", 13, 5000, undefined, "Armour option: Computer/2", crb(104)),
  simple("extended-life-support", "Extended Life Support", "other", 10, 10000, undefined, "Armour option: 18 hours life support", crb(104)),
  simple("eye-protection", "Eye Protection", "other", 6, 50, undefined, "Armour option: included in TL9+ armour", crb(104)),
  simple("grav-assist-tl12", "Grav Assist (TL12)", "other", 12, 110000, undefined, "Armour option: grav belt function (combat armour/battle dress)", crb(104)),
  simple("grav-assist-tl15", "Grav Assist (TL15)", "other", 15, 120000, undefined, "Armour option: grav belt function, longer duration", crb(104)),
  simple("magnetic-grapples", "Magnetic Grapples", "other", 8, 100, undefined, "Armour option: walk on hulls in zero-G", crb(104)),
  simple("armour-medikit-tl10", "Medikit (Armour, TL10)", "other", 10, 5000, undefined, "Armour option: auto first aid as Medic 3, Fast Drug", crb(104)),
  simple("armour-medikit-tl11", "Medikit (Armour, TL11)", "other", 11, 10000, undefined, "Armour option: as TL10 plus combat drugs/metabolic accelerator", crb(104)),
  simple("armour-self-sealing", "Self-Sealing (Armour)", "other", 11, 2000, undefined, "Armour option: repairs minor breaches", crb(104)),
  simple("smart-fabric", "Smart Fabric", "other", 10, 1000, undefined, "Armour option: self-cleaning", crb(104)),
  simple("thruster-pack-tl9", "Thruster Pack (TL9)", "other", 9, 2000, undefined, "Armour option: zero-G manoeuvring, short range", crb(104)),
  simple("thruster-pack-tl12", "Thruster Pack (TL12)", "other", 12, 14000, undefined, "Armour option: 0.1g for up to 48 hours", crb(104)),
  simple("thruster-pack-tl14", "Thruster Pack (TL14)", "other", 14, 20000, undefined, "Armour option: 0.1g for up to 48 hours, grav plates", crb(104)),

  /* ---------------- Augments (CRB p106) ---------------- */
  simple("cognitive-augmentation-1", "Cognitive Augmentation (INT +1)", "augment", 12, 500000, undefined, "INT +1", crb(106)),
  simple("cognitive-augmentation-2", "Cognitive Augmentation (INT +2)", "augment", 14, 1000000, undefined, "INT +2", crb(106)),
  simple("cognitive-augmentation-3", "Cognitive Augmentation (INT +3)", "augment", 16, 5000000, undefined, "INT +3", crb(106)),
  simple("dexterity-augmentation-1", "Dexterity Augmentation (DEX +1)", "augment", 11, 500000, undefined, "DEX +1", crb(106)),
  simple("dexterity-augmentation-2", "Dexterity Augmentation (DEX +2)", "augment", 12, 1000000, undefined, "DEX +2", crb(106)),
  simple("dexterity-augmentation-3", "Dexterity Augmentation (DEX +3)", "augment", 15, 5000000, undefined, "DEX +3", crb(106)),
  simple("endurance-augmentation-1", "Endurance Augmentation (END +1)", "augment", 11, 500000, undefined, "END +1", crb(106)),
  simple("endurance-augmentation-2", "Endurance Augmentation (END +2)", "augment", 12, 1000000, undefined, "END +2", crb(106)),
  simple("endurance-augmentation-3", "Endurance Augmentation (END +3)", "augment", 15, 5000000, undefined, "END +3", crb(106)),
  simple("enhanced-vision", "Enhanced Vision", "augment", 13, 25000, undefined, "Binoculars, IR/Light Intensification", crb(106)),
  simple("neural-comm-tl10", "Neural Comm (TL10)", "augment", 10, 1000, undefined, "Audio only", crb(106)),
  simple("neural-comm-tl12", "Neural Comm (TL12)", "augment", 12, 5000, undefined, "Audio and visual, Computer/0", crb(106)),
  simple("neural-comm-tl14", "Neural Comm (TL14)", "augment", 14, 20000, undefined, "Multiple forms of data, Computer/1", crb(106)),
  simple("skill-augmentation", "Skill Augmentation", "augment", 12, 50000, undefined, "Skill DM+1 (one skill only)", crb(106)),
  simple("strength-augmentation-1", "Strength Augmentation (STR +1)", "augment", 11, 500000, undefined, "STR +1", crb(106)),
  simple("strength-augmentation-2", "Strength Augmentation (STR +2)", "augment", 12, 1000000, undefined, "STR +2", crb(106)),
  simple("strength-augmentation-3", "Strength Augmentation (STR +3)", "augment", 15, 5000000, undefined, "STR +3", crb(106)),
  simple("subdermal-armour-1", "Subdermal Armour (+1)", "augment", 10, 50000, undefined, "Protection +1 (stacks with armour)", crb(106)),
  simple("subdermal-armour-3", "Subdermal Armour (+3)", "augment", 11, 100000, undefined, "Protection +3 (stacks with armour)", crb(106)),
  simple("wafer-jack-tl12", "Wafer Jack (TL12)", "augment", 12, 10000, undefined, "Capacity Bandwidth/4, Computer/2 for Expert only", crb(106)),
  simple("wafer-jack-tl13", "Wafer Jack (TL13)", "augment", 13, 15000, undefined, "Capacity Bandwidth/8, Computer/2 for Expert only", crb(106)),

  /* ---------------- Augments (Central Supply Catalogue) ---------------- */
  simple("additional-manipulator-basic", "Additional Manipulator (Basic)", "augment", 10, 7500, undefined, "STR 6, DEX 10", csc(50)),
  simple("additional-manipulator-improved", "Additional Manipulator (Improved)", "augment", 12, 15000, undefined, "STR 9, DEX 12", csc(50)),
  simple("additional-manipulator-advanced", "Additional Manipulator (Advanced)", "augment", 14, 25000, undefined, "STR 9, DEX 15", csc(50)),
  simple("all-temperature-epidermal-symbiote", "All-Temperature Epidermal Symbiote", "augment", 14, 2500, undefined, "Ignore temperature -30 to +50C, liquid needs -20%", csc(50)),
  simple("altered-appearance-basic", "Altered Appearance (Basic)", "augment", 6, 10000, undefined, "Plastic surgery", csc(50)),
  simple("altered-appearance-improved", "Altered Appearance (Improved)", "augment", 9, 50000, undefined, "Whole body transformation", csc(50)),
  simple("altered-appearance-advanced", "Altered Appearance (Advanced)", "augment", 12, 200000, undefined, "Whole body plus genetic alteration", csc(50)),
  simple("bio-fusion-power-port", "Bio-fusion Power Port", "augment", 13, 10000, undefined, "Power source for energy pistol, 50 shots/day", csc(51)),
  simple("genetic-aquamorph-adaption", "Genetic Aquamorph Adaption", "augment", 12, 30000, undefined, "Amphibious", csc(51)),
  simple("genetic-environmental-adaption", "Genetic Environmental Adaption", "augment", 12, 50000, undefined, "Adaptation to one world or factor", csc(52)),
  simple("genetic-microgravity-adaption", "Genetic Microgravity Adaption", "augment", 12, 30000, undefined, "Microgravity adapted, STR +1, DEX +1, END -1", csc(52)),
  simple("internal-auto-injector", "Internal Auto-injector", "augment", 10, 10000, undefined, "Conditional drug release", csc(53)),
  simple("metastatic-platelet-injection", "Metastatic Platelet Injection", "augment", 12, 25000, undefined, "Doubles natural healing", csc(53)),
  simple("muscular-bridging", "Muscular Bridging", "augment", 13, 250000, undefined, "STR +1, DEX +1, movement +3m", csc(53)),
  simple("soldiers-organ-package", "Soldier's Organ Package", "augment", 12, 1500000, undefined, "Redundant and improved organs", csc(53)),
  simple("smuggling-container", "Smuggling Container", "augment", 8, 15000, undefined, "Internal concealed container, 5kg", csc(54)),
  simple("subdermal-armour-4", "Subdermal Armour (+4)", "augment", 12, 250000, undefined, "Protection +4 (stacks with armour)", csc(54)),
  simple("subdermal-armour-5", "Subdermal Armour (+5)", "augment", 14, 500000, undefined, "Protection +5 (stacks with armour)", csc(54)),
  simple("terminal-stabilisation-system", "Terminal Stabilisation System", "augment", 16, 2500000, undefined, "+1D END on death", csc(54)),
  simple("video-tattoo-controller", "Video Tattoo Controller", "augment", 12, 20000, undefined, "Controls video tattoo", csc(54)),
  simple("video-tattoo-limb", "Video Tattoo (Limb)", "augment", 12, 20000, undefined, "Covers one limb, head or half torso", csc(54)),
  simple("video-tattoo-full-body", "Video Tattoo (Full Body)", "augment", 12, 120000, undefined, "Covers entire body, Stealth DM+2 when camouflaged", csc(54)),
  { ...simple("aslan-cyber-claw", "Aslan Cyber-claw", "augment", 9, 10000, undefined, "Melee, Dmg 1D+1", csc(54)), skill: BLADE },
  simple("autonomous-locomotion-rig", "Autonomous Locomotion Rig (ALR)", "augment", 9, 15000, undefined, "Auto-walk to set destination", csc(55)),
  simple("combat-arm-basic", "Combat Arm (Basic)", "augment", 8, 25000, undefined, "STR 12, Protection +2, melee weapon fitting", csc(55)),
  simple("combat-arm-improved", "Combat Arm (Improved)", "augment", 11, 50000, undefined, "STR 15, Protection +4, melee or pistol fitting", csc(55)),
  simple("combat-arm-advanced", "Combat Arm (Advanced)", "augment", 13, 75000, undefined, "STR 18, Protection +6, melee or pistol fitting", csc(55)),
  simple("enhanced-mobility-basic", "Enhanced Mobility (Basic)", "augment", 8, 10000, undefined, "+1.5m movement, DM+1 balance", csc(56)),
  simple("enhanced-mobility-improved", "Enhanced Mobility (Improved)", "augment", 11, 15000, undefined, "+3m movement, DM+2 balance", csc(56)),
  simple("enhanced-mobility-advanced", "Enhanced Mobility (Advanced)", "augment", 13, 25000, undefined, "+6m movement, DM+3 balance", csc(56)),
  { ...simple("razor-claws-basic", "Razor Claws (Basic)", "augment", 11, 20000, undefined, "Melee, Dmg 2D, AP 3", csc(56)), skill: BLADE },
  { ...simple("razor-claws-improved", "Razor Claws (Improved)", "augment", 13, 35000, undefined, "Melee, Dmg 2D, AP 8", csc(56)), skill: BLADE },
  { ...simple("razor-claws-advanced", "Razor Claws (Advanced)", "augment", 15, 50000, undefined, "Melee, Dmg 4D, AP 20", csc(56)), skill: BLADE },
  simple("prosthetic-limb-primitive", "Prosthetic Limb (Primitive)", "augment", 2, 100, undefined, "DM-2 DEX checks with limb", csc(56)),
  simple("prosthetic-limb-basic", "Prosthetic Limb (Basic)", "augment", 7, 250, undefined, "DM-1 DEX checks with limb", csc(56)),
  simple("prosthetic-limb-improved", "Prosthetic Limb (Improved)", "augment", 9, 5000, undefined, "No DEX penalty", csc(56)),
  simple("weapon-implant-dagger", "Weapon Implant - Dagger", "augment", 10, 5000, undefined, "Concealed dagger", csc(57)),
  simple("weapon-implant-stunstick", "Weapon Implant - Stunstick", "augment", 10, 10000, undefined, "Concealed stunstick", csc(57)),
  simple("weapon-implant-auto-pistol", "Weapon Implant - Auto Pistol", "augment", 10, 12000, undefined, "Concealed autopistol", csc(57)),
  simple("weapon-implant-laser-pistol", "Weapon Implant - Laser Pistol", "augment", 11, 25000, undefined, "Concealed laser pistol", csc(57)),
  simple("assisted-ambulation-basic", "Assisted Ambulation (Basic)", "augment", 13, 100000, undefined, "4 hours sleep, 3x food", csc(58)),
  simple("assisted-ambulation-improved", "Assisted Ambulation (Improved)", "augment", 14, 300000, undefined, "2 hours sleep, 2x food", csc(58)),
  simple("assisted-ambulation-advanced", "Assisted Ambulation (Advanced)", "augment", 15, 500000, undefined, "1 hour sleep, 1.5x food", csc(58)),
  simple("ballistic-tracking-lenses", "Ballistic Tracking Lenses", "augment", 11, 8000, undefined, "DM+1 unassisted ranged attacks", csc(58)),
  simple("cockpit-sensory-suite", "Cockpit Sensory Suite", "augment", 10, 500000, undefined, "DM+1 high-speed vehicle checks", csc(58)),
  simple("complex-cranial-processing-unit", "Complex Cranial Processing Unit", "augment", 14, 350000, undefined, "DM+1 complex Science checks", csc(58)),
  simple("enhanced-vision-improved", "Enhanced Vision (Improved)", "augment", 14, 50000, undefined, "PRIS binocular functionality", csc(58)),
  simple("fabulous-augmentation-treatment", "Fabulous Augmentation Treatment", "augment", 15, 3500000, undefined, "DM+1 social interaction checks", csc(59)),
  simple("mechanostatic-scanner", "Mechanostatic Scanner", "augment", 13, 10000, undefined, "Detects augments within 20m", csc(59)),
  simple("neural-comm-tl15", "Neural Comm (TL15)", "augment", 15, 25000, undefined, "Multiple forms of data, Computer/2", csc(59)),
  simple("neural-link", "Neural Link", "augment", 13, 30000, undefined, "Neural comm plus nervous system access", csc(60)),
  simple("neural-jack", "Neural Jack", "augment", 13, 50000, undefined, "Neural link plus Wafer Jack/8", csc(60)),
  simple("nerve-plug-response-rig", "Nerve-plug Response Rig", "augment", 13, 225000, undefined, "DM+2 DEX checks in powered armour (suit +50% cost)", csc(60)),
  simple("null-skull", "Null Skull", "augment", 16, 1000000, undefined, "PSI 0, DM-6 to psionics against user", csc(60)),
  simple("peripheral-vision-enhancement", "Peripheral Vision Enhancement", "augment", 10, 50000, undefined, "DM+1 Initiative and Recon to spot", csc(60)),
  simple("psi-taps", "Psi-taps", "augment", 16, 750000, undefined, "PSI +2 (max 10)", csc(60)),
  simple("shriekerbox-basic", "Shriekerbox (Basic)", "augment", 10, 8000, undefined, "Amplify voice, static DM-1", csc(60)),
  simple("shriekerbox-improved", "Shriekerbox (Improved)", "augment", 12, 16000, undefined, "As basic plus mimic any voice", csc(60)),
  simple("venom-glands", "Venom Glands", "augment", 11, 10000, undefined, "Bite +D3 damage", csc(61)),
  simple("wafer-jack-tl15", "Wafer Jack (TL15)", "augment", 15, 30000, undefined, "Capacity Bandwidth/12, Computer/3 for Expert only", csc(61)),

  /* ---------------- Communications (CRB p108-109) ---------------- */
  simple("radio-transceiver-tl5-5km", "Radio Transceiver (TL5, 5km)", "comms", 5, 225, 20, "Range 5km", crb(108)),
  simple("radio-transceiver-tl5-50km", "Radio Transceiver (TL5, 50km)", "comms", 5, 750, 70, "Range 50km", crb(108)),
  simple("radio-transceiver-tl5-500km", "Radio Transceiver (TL5, 500km)", "comms", 5, 1500, 150, "Range 500km", crb(108)),
  simple("radio-transceiver-tl5-5000km", "Radio Transceiver (TL5, 5000km)", "comms", 5, 15000, 300, "Range 5000km", crb(108)),
  simple("radio-transceiver-tl8", "Radio Transceiver (TL8)", "comms", 8, 75, undefined, "Range 50km", crb(108)),
  simple("radio-transceiver-tl9-500km", "Radio Transceiver (TL9, 500km)", "comms", 9, 500, undefined, "Range 500km", crb(108)),
  simple("radio-transceiver-tl9-2500km", "Radio Transceiver (TL9, 2500km)", "comms", 9, 5000, undefined, "Range 2500km, Computer/0", crb(108)),
  simple("radio-transceiver-tl10", "Radio Transceiver (TL10)", "comms", 10, 250, undefined, "Range 500km, Computer/0", crb(108)),
  simple("radio-transceiver-tl12", "Radio Transceiver (TL12)", "comms", 12, 1000, 1, "Range 10000km, Computer/0", crb(108)),
  simple("radio-transceiver-tl13", "Radio Transceiver (TL13)", "comms", 13, 250, undefined, "Range 1000km, Computer/1", crb(108)),
  simple("radio-transceiver-tl14", "Radio Transceiver (TL14)", "comms", 14, 500, undefined, "Range 3000km, Computer/1", crb(108)),
  simple("laser-transceiver-tl9", "Laser Transceiver (TL9)", "comms", 9, 2500, 1.5, "Range 500km, Computer/0", crb(108)),
  simple("laser-transceiver-tl11", "Laser Transceiver (TL11)", "comms", 11, 1500, 0.5, "Range 500km, Computer/0", crb(108)),
  simple("laser-transceiver-tl13", "Laser Transceiver (TL13)", "comms", 13, 500, undefined, "Range 500km, Computer/1", crb(108)),
  simple("bug-tl5", "Bug (TL5)", "comms", 5, 50, undefined, "Audio only", crb(109)),
  simple("bug-tl7", "Bug (TL7)", "comms", 7, 100, undefined, "Audio or Visual", crb(109)),
  simple("bug-tl9", "Bug (TL9)", "comms", 9, 200, undefined, "Audio or Visual or Data", crb(109)),
  simple("bug-tl11", "Bug (TL11)", "comms", 11, 300, undefined, "Audio/Visual/Data", crb(109)),
  simple("bug-tl13", "Bug (TL13)", "comms", 13, 400, undefined, "Audio/Visual/Data/Bioscan", crb(109)),
  simple("bug-tl15", "Bug (TL15)", "comms", 15, 500, undefined, "Audio/Visual/Data/Bioscan/Computer/1", crb(109)),
  simple("commdot", "Commdot", "comms", 10, 10, undefined, "Range a few metres, relays to other comms", crb(109)),
  simple("mobile-comm-tl6", "Mobile Comm (TL6)", "comms", 6, 50, undefined, "Audio only", crb(109)),
  simple("mobile-comm-tl8", "Mobile Comm (TL8)", "comms", 8, 150, undefined, "Audio and visual, Computer/0", crb(109)),
  simple("mobile-comm-tl10", "Mobile Comm (TL10)", "comms", 10, 500, undefined, "Multiple forms of data, Computer/1", crb(109)),

  /* ---------------- Computers and software (CRB p111-112) ---------------- */
  simple("computer-terminal", "Computer Terminal", "computer", 7, 200, 2, "Computer/0 (dumb terminal)", crb(111)),
  simple("portable-computer-tl7", "Portable Computer (TL7)", "computer", 7, 500, 5, "Computer/0", crb(112)),
  simple("portable-computer-tl8", "Portable Computer (TL8)", "computer", 8, 250, 2, "Computer/1", crb(112)),
  simple("portable-computer-tl9", "Portable Computer (TL9)", "computer", 9, 100, 1, "Computer/1", crb(112)),
  simple("portable-computer-tl10", "Portable Computer (TL10)", "computer", 10, 500, 0.5, "Computer/2", crb(112)),
  simple("portable-computer-tl11", "Portable Computer (TL11)", "computer", 11, 300, 0.5, "Computer/2", crb(112)),
  simple("portable-computer-tl12", "Portable Computer (TL12)", "computer", 12, 1000, 0.5, "Computer/3", crb(112)),
  simple("portable-computer-tl13", "Portable Computer (TL13)", "computer", 13, 1500, 0.5, "Computer/4", crb(112)),
  simple("portable-computer-tl14", "Portable Computer (TL14)", "computer", 14, 5000, 0.5, "Computer/5", crb(112)),
  simple("data-display-recorder", "Data Display/Recorder", "computer", 13, 500, undefined, "Heads-up display headpiece", crb(112)),
  simple("data-wafer", "Data Wafer", "computer", 10, 5, undefined, "Storage medium", crb(112)),
  simple("intelligent-interface", "Intelligent Interface", "computer", 11, 100, undefined, "Software, Bandwidth 1; required for Expert", crb(111)),
  simple("security-1", "Security/1", "computer", 10, 200, undefined, "Software, Bandwidth 1; bypass Difficult (10+)", crb(111)),
  simple("security-2", "Security/2", "computer", 11, 1000, undefined, "Software, Bandwidth 2; bypass Very Difficult (12+)", crb(111)),
  simple("security-3", "Security/3", "computer", 12, 20000, undefined, "Software, Bandwidth 3; bypass Formidable (14+)", crb(111)),
  simple("intrusion-1", "Intrusion/1", "computer", 10, 1000, undefined, "Software, Bandwidth 1; hacking DM+1", crb(111)),
  simple("intrusion-2", "Intrusion/2", "computer", 11, 10000, undefined, "Software, Bandwidth 2; hacking DM+2", crb(111)),
  simple("intrusion-3", "Intrusion/3", "computer", 13, 100000, undefined, "Software, Bandwidth 3; hacking DM+3", crb(111)),
  simple("intrusion-4", "Intrusion/4", "computer", 15, 1000000, undefined, "Software, Bandwidth 4; hacking DM+4", crb(111)),
  simple("expert-1", "Expert/1", "computer", 11, 1000, undefined, "Software, Bandwidth 1; skill 0 (or DM+1)", crb(111)),
  simple("expert-2", "Expert/2", "computer", 12, 10000, undefined, "Software, Bandwidth 2; skill 1 (or DM+1)", crb(111)),
  simple("expert-3", "Expert/3", "computer", 13, 100000, undefined, "Software, Bandwidth 3; skill 2 (or DM+1)", crb(111)),
  simple("translator-0", "Translator/0", "computer", 9, 50, undefined, "Software, Bandwidth 0; near-real-time translation", crb(111)),
  simple("translator-1", "Translator/1", "computer", 10, 500, undefined, "Software, Bandwidth 1; real-time translation", crb(111)),
  simple("database", "Database", "computer", 7, 10, undefined, "Software; cost Cr10-10000 by topic", crb(111)),
  simple("agent-0", "Agent/0", "computer", 11, 500, undefined, "Software, Bandwidth 0; Electronics (computers) 0", crb(111)),
  simple("agent-1", "Agent/1", "computer", 12, 2000, undefined, "Software, Bandwidth 1; Electronics (computers) 1", crb(111)),
  simple("agent-2", "Agent/2", "computer", 13, 100000, undefined, "Software, Bandwidth 2; Electronics (computers) 2", crb(111)),
  simple("agent-3", "Agent/3", "computer", 14, 250000, undefined, "Software, Bandwidth 3; Electronics (computers) 3", crb(111)),
  simple("intellect-1", "Intellect/1", "computer", 12, 2000, undefined, "Software, Bandwidth 1; uses 1 Expert skill", crb(111)),
  simple("intellect-2", "Intellect/2", "computer", 13, 50000, undefined, "Software, Bandwidth 2; uses 2 Expert skills", crb(111)),
  simple("intellect-3", "Intellect/3", "computer", 14, 200000, undefined, "Software, Bandwidth 3; uses 3 Expert skills", crb(111)),

  /* ---------------- Medical (CRB p114) ---------------- */
  simple("cryoberth", "Cryoberth", "medical", 10, 50000, 200, "Emergency stasis, 1 week internal power", crb(114)),
  simple("medikit-tl8", "Medikit (TL8)", "medical", 8, 1000, 1, "Medic tools and drugs", crb(114)),
  simple("medikit-tl10", "Medikit (TL10)", "medical", 10, 1500, 1, "First aid DM+1", crb(114)),
  simple("medikit-tl12", "Medikit (TL12)", "medical", 12, 5000, 1, "First aid DM+2", crb(114)),
  simple("medikit-tl14", "Medikit (TL14)", "medical", 14, 10000, 0, "First aid DM+3", crb(114)),

  /* ---------------- Drugs (CRB p115), cost per dose ---------------- */
  simple("anagathics", "Anagathics", "drug", 15, 20000, undefined, "Per dose; one dose a month slows ageing", crb(115)),
  simple("anti-rad", "Anti-rad", "drug", 8, 1000, undefined, "Per dose; absorbs up to 100 rads", crb(115)),
  simple("combat-drugs", "Combat Drugs", "drug", 10, 1000, undefined, "Per dose; Initiative DM+4, free Reaction, damage -2", crb(115)),
  simple("fast-drug", "Fast Drug", "drug", 10, 200, undefined, "Per dose; metabolism slowed 60:1", crb(115)),
  simple("medicinal-drugs", "Medicinal Drugs", "drug", 5, 5, undefined, "Per dose; Cr5 to several thousand", crb(115)),
  simple("metabolic-accelerator", "Metabolic Accelerator", "drug", 10, 500, undefined, "Per dose; Initiative DM+8, two free Reactions", crb(115)),
  simple("panaceas", "Panaceas", "drug", 8, 200, undefined, "Per dose; treat disease as Medic 0", crb(115)),
  simple("slow-drug", "Slow Drug", "drug", 11, 500, undefined, "Per dose; month of healing in a day (medical facility only)", crb(115)),
  simple("stims", "Stims", "drug", 8, 50, undefined, "Per dose; removes Fatigue, 1 damage", crb(115)),

  /* ---------------- Sensors (CRB p116) ---------------- */
  simple("binoculars-tl3", "Binoculars (TL3)", "sensor", 3, 75, 1, "Magnification", crb(116)),
  simple("binoculars-tl8", "Binoculars (TL8)", "sensor", 8, 750, 1, "Image capture, light intensification", crb(116)),
  simple("binoculars-tl12", "Binoculars (TL12)", "sensor", 12, 3500, 1, "PRIS: infrared to gamma", crb(116)),
  simple("bioscanner", "Bioscanner", "sensor", 15, 350000, 3.5, "Organic/chemical analysis, life signs", crb(116)),
  simple("densitometer", "Densitometer", "sensor", 14, 20000, 5, "3D density imaging", crb(116)),
  simple("em-probe", "EM Probe", "sensor", 10, 1000, 1, "Detects EM emissions", crb(116)),
  simple("geiger-counter-tl5", "Geiger Counter (TL5)", "sensor", 5, 250, 2, "Detects radiation", crb(116)),
  simple("geiger-counter-tl10", "Geiger Counter (TL10)", "sensor", 10, 150, undefined, "Detects radiation", crb(116)),
  simple("ir-goggles", "IR Goggles", "sensor", 6, 500, undefined, "See heat sources in the dark", crb(116)),
  simple("light-intensifier-goggles-tl7", "Light Intensifier Goggles (TL7)", "sensor", 7, 500, 1, "See in low light", crb(116)),
  simple("light-intensifier-goggles-tl9", "Light Intensifier Goggles (TL9)", "sensor", 9, 1250, undefined, "Low light plus IR", crb(116)),
  simple("nas", "NAS", "sensor", 15, 35000, 10, "Neural activity scanner, 500m", crb(116)),

  /* ---------------- Survival gear (CRB p118, options p120) ---------------- */
  simple("artificial-gill", "Artificial Gill", "survival", 8, 4000, 4, "Breathe underwater (Atm 4-9)", crb(118)),
  simple("breather-mask-tl8", "Breather Mask (TL8)", "survival", 8, 150, undefined, "Filter and respirator", crb(118)),
  simple("breather-mask-tl10", "Breather Mask (TL10)", "survival", 10, 2000, undefined, "Filter and respirator, nasal/implant", crb(118)),
  simple("climbing-kit-tl4", "Climbing Kit (TL4)", "survival", 4, 100, 4, "Climb DM+1", crb(118)),
  simple("climbing-kit-tl8", "Climbing Kit (TL8)", "survival", 8, 500, 2, "Climb DM+2", crb(118)),
  simple("environment-suit", "Environment Suit", "survival", 8, 500, 1, "Protection from extreme heat/cold", crb(118)),
  simple("filter-mask", "Filter Mask", "survival", 7, 100, undefined, "Filters tainted air", crb(118)),
  simple("grav-belt", "Grav Belt", "survival", 12, 100000, 6, "Flight at Medium speed, 4 hours (12 at TL15)", crb(118)),
  simple("habitat-module-tl8", "Habitat Module (TL8)", "survival", 8, 10000, 1000, "Unpressurised shelter for 6", crb(118)),
  simple("habitat-module-tl10", "Habitat Module (TL10)", "survival", 10, 20000, 500, "Pressurised shelter for 6, 1 week life support", crb(118)),
  simple("portable-fusion-generator", "Portable Fusion Generator", "survival", 10, 500000, 20, "Recharges equipment for 1 month", crb(118)),
  simple("radiation-suit", "Radiation Suit", "survival", 6, 5000, 10, "Rad 100", crb(118)),
  simple("rescue-bubble", "Rescue Bubble", "survival", 9, 600, 2, "Emergency bubble, 2 person-hours life support", crb(118)),
  simple("respirator-tl6", "Respirator (TL6)", "survival", 6, 100, undefined, "Breathe thin atmosphere", crb(118)),
  simple("respirator-tl10", "Respirator (TL10)", "survival", 10, 2000, undefined, "Breathe thin atmosphere, nasal/implant", crb(118)),
  simple("tent-tl3", "Tent (TL3)", "survival", 3, 200, 6, "Shelter for 2", crb(118)),
  simple("tent-tl7", "Tent (TL7)", "survival", 7, 2000, 5, "Shelter for 2, pressurised", crb(118)),
  simple("climate-controlled", "Climate Controlled", "other", 10, 500, undefined, "Structure option", crb(120)),
  simple("self-assembling", "Self-Assembling", "other", 11, 5000, undefined, "Structure option: sets up in 1 man-hour", crb(120)),
  simple("structure-self-sealing", "Self-Sealing (Structure)", "other", 13, 2000, undefined, "Structure option: repairs small breaches", crb(120)),

  /* ---------------- Toolkits (CRB p120) ---------------- */
  simple("electronics-toolkit", "Electronics Toolkit", "toolkit", 7, 2000, 2, "Electronics repairs and installation", crb(120)),
  simple("engineering-toolkit", "Engineering Toolkit", "toolkit", 12, 4000, 12, "Engineer repairs and installation", crb(120)),
  simple("forensics-toolkit", "Forensics Toolkit", "toolkit", 8, 2000, 12, "Crime scene investigation", crb(120)),
  simple("mechanical-toolkit", "Mechanical Toolkit", "toolkit", 5, 1000, 12, "Mechanic repairs and construction", crb(120)),
  simple("surveying-toolkit", "Surveying Toolkit", "toolkit", 6, 1000, 12, "Planetary survey and mapping", crb(120)),

  /* ---------------- Scientific equipment (CRB p120-123) ---------------- */
  simple("scientific-toolkit", "Scientific Toolkit", "science", 5, 2000, 8, "Scientific testing and analysis", crb(120)),
  simple("archaeology-science-toolkit", "Archaeology Science Toolkit", "science", 12, 2000, 8, "Science (archaeology) DM+2", crb(123)),
  simple("cybernetics-science-toolkit", "Cybernetics Science Toolkit", "science", 12, 2000, 8, "Science (cybernetics) DM+2", crb(123)),
  simple("life-sciences-toolkit", "Life Sciences Toolkit", "science", 12, 2000, 8, "Science (biology, genetics, xenology) DM+2", crb(123)),
  simple("planetology-science-toolkit", "Planetology Science Toolkit", "science", 12, 2000, 8, "Science (planetology) DM+2", crb(123)),
  simple("psionicology-science-toolkit", "Psionicology Science Toolkit", "science", 12, 2000, 8, "Science (psionicology) DM+2", crb(123)),
  simple("robotics-science-toolkit", "Robotics Science Toolkit", "science", 12, 2000, 8, "Science (robotics) DM+2", crb(123)),
  simple("space-sciences-toolkit", "Space Sciences Toolkit", "science", 12, 2000, 8, "Science (astronomy, cosmology) DM+2", crb(123)),
  simple("physical-sciences-toolkit", "Physical Sciences Toolkit", "science", 12, 2000, 8, "Science (chemistry, physics) DM+2", crb(123)),
  simple("social-science-expert-package-economics", "Social Science Expert Package (Economics)", "science", 12, 2000, 1, "Science (economics) DM+2", crb(123)),
  simple("social-science-expert-package-history", "Social Science Expert Package (History)", "science", 12, 2000, 1, "Science (history) DM+2", crb(123)),
  simple("social-science-expert-package-linguistics", "Social Science Expert Package (Linguistics)", "science", 12, 2000, 1, "Science (linguistics) DM+2", crb(123)),
  simple("social-science-expert-package-philosophy", "Social Science Expert Package (Philosophy)", "science", 12, 2000, 1, "Science (philosophy) DM+2", crb(123)),
  simple("social-science-expert-package-psychology", "Social Science Expert Package (Psychology)", "science", 12, 2000, 1, "Science (psychology) DM+2", crb(123)),
  simple("social-science-expert-package-sophontology", "Social Science Expert Package (Sophontology)", "science", 12, 2000, 1, "Science (sophontology) DM+2", crb(123)),

  /* ---------------- Melee weapons (CRB p124) ---------------- */
  weapon("blade", "Blade", "blade", BLADE, 2, "Melee", "2D", 1, 100, null, null, null, 124),
  weapon("broadsword", "Broadsword", "blade", BLADE, 2, "Melee", "4D", 3, 500, null, null, "Bulky", 124),
  weapon("cutlass", "Cutlass", "blade", BLADE, 2, "Melee", "3D", 2, 200, null, null, null, 124),
  weapon("dagger", "Dagger", "blade", BLADE, 1, "Melee", "1D+2", 0.5, 10, null, null, null, 124),
  weapon("rapier", "Rapier", "blade", BLADE, 3, "Melee", "2D", 0.5, 200, null, null, "Parry DM+1", 124),
  weapon("club", "Club", "melee", BLUDGEON, 1, "Melee", "2D", 2, 0, null, null, null, 124),
  weapon("shield", "Shield", "melee", BLUDGEON, 1, "Melee", "1D", 2, 150, null, null, "Melee +1 when parrying", 124),
  weapon("staff", "Staff", "melee", BLUDGEON, 1, "Melee", "2D", 2, 0, null, null, null, 124),
  weapon("stunstick", "Stunstick", "melee", BLUDGEON, 8, "Melee", "2D", 0.5, 300, null, null, "Stun", 124),

  /* ---------------- Slug throwers (CRB p126) ---------------- */
  weapon("antique-pistol", "Antique Pistol", "gun", SLUG, 2, "5m", "2D-3", 0.5, 100, "1", "Cr5", null, 126),
  weapon("autopistol", "Autopistol", "gun", SLUG, 5, "10m", "3D-3", 1, 200, "15", "Cr10", null, 126),
  weapon("body-pistol", "Body Pistol", "gun", SLUG, 8, "5m", "2D", undefined, 500, "6", "Cr10", null, 126),
  weapon("gauss-pistol", "Gauss Pistol", "gun", SLUG, 13, "20m", "3D", 1, 500, "40", "Cr20", "AP 3, Auto 2", 126),
  weapon("revolver", "Revolver", "gun", SLUG, 4, "10m", "3D-3", 0.5, 150, "6", "Cr5", null, 126),
  weapon("snub-pistol", "Snub Pistol", "gun", SLUG, 8, "5m", "3D-3", undefined, 150, "6", "Cr10", "Zero-G", 126),
  weapon("accelerator-rifle", "Accelerator Rifle", "gun", SLUG, 9, "250m", "3D", 2, 900, "15", "Cr30", "Zero-G", 126),
  weapon("advanced-combat-rifle", "Advanced Combat Rifle", "gun", SLUG, 10, "450m", "3D", 3, 1000, "40", "Cr15", "Auto 3, Scope", 126),
  weapon("antique-rifle", "Antique Rifle", "gun", SLUG, 2, "25m", "3D-3", 3, 150, "1", "Cr10", null, 126),
  weapon("assault-rifle", "Assault Rifle", "gun", SLUG, 7, "200m", "3D", 4, 500, "30", "Cr15", "Auto 2", 126),
  weapon("autorifle", "Autorifle", "gun", SLUG, 6, "300m", "3D", 5, 750, "20", "Cr10", "Auto 2", 126),
  weapon("gauss-rifle", "Gauss Rifle", "gun", SLUG, 12, "600m", "4D", 4, 1500, "80", "Cr40", "AP 5, Auto 3, Scope", 126),
  weapon("rifle", "Rifle", "gun", SLUG, 5, "250m", "3D", 3, 200, "5", "Cr10", null, 126),
  weapon("shotgun", "Shotgun", "gun", SLUG, 4, "50m", "4D", 4, 200, "6", "Cr10", "Bulky", 126),
  weapon("submachine-gun", "Submachine Gun", "gun", SLUG, 6, "25m", "3D", 3, 400, "20", "Cr10", "Auto 3", 126),

  /* ---------------- Energy weapons (CRB p129) ---------------- */
  weapon("laser-pistol-tl9", "Laser Pistol (TL9)", "gun", ENERGY, 9, "20m", "3D", 2, 2000, "100", "Cr1000", "Zero-G", 129),
  weapon("laser-pistol-tl11", "Laser Pistol (TL11)", "gun", ENERGY, 11, "30m", "3D+3", 1, 3000, "100", "Cr3000", "Zero-G", 129),
  weapon("stunner-tl8", "Stunner (TL8)", "gun", ENERGY, 8, "5m", "2D", 0.5, 500, "100", "Cr200", "Stun, Zero-G", 129),
  weapon("stunner-tl10", "Stunner (TL10)", "gun", ENERGY, 10, "5m", "2D+3", undefined, 750, "100", "Cr200", "Stun, Zero-G", 129),
  weapon("stunner-tl12", "Stunner (TL12)", "gun", ENERGY, 12, "10m", "3D", undefined, 1000, "100", "Cr200", "Stun, Zero-G", 129),
  weapon("laser-carbine-tl9", "Laser Carbine (TL9)", "gun", ENERGY, 9, "150m", "4D", 4, 2500, "50", "Cr1000", "Zero-G", 129),
  weapon("laser-carbine-tl11", "Laser Carbine (TL11)", "gun", ENERGY, 11, "200m", "4D+3", 2, 4000, "50", "Cr3000", "Zero-G", 129),
  weapon("laser-rifle-tl9", "Laser Rifle (TL9)", "gun", ENERGY, 9, "200m", "5D", 5, 3500, "100", "Cr1500", "Zero-G", 129),
  weapon("laser-rifle-tl11", "Laser Rifle (TL11)", "gun", ENERGY, 11, "400m", "5D+3", 3, 8000, "100", "Cr3500", "Zero-G", 129),
  weapon("laser-sniper-rifle", "Laser Sniper Rifle", "gun", ENERGY, 12, "600m", "5D+3", 4, 9000, "6", "Cr250", "Scope, Zero-G", 129),
  weapon("plasma-rifle", "Plasma Rifle", "gun", ENERGY, 16, "300m", "6D", 4, 100000, "Unlimited", null, null, 129),

  /* ---------------- Grenades (CRB p131) ---------------- */
  weapon("aerosol-grenade", "Aerosol Grenade", "grenade", "Athletics (dexterity)", 9, "20m", "--", 0.5, 15, null, null, "Blast 9, lasers -10 damage", 131),
  weapon("frag-grenade", "Frag Grenade", "grenade", "Athletics (dexterity)", 6, "20m", "5D", 0.5, 30, null, null, "Blast 9", 131),
  weapon("smoke-grenade", "Smoke Grenade", "grenade", "Athletics (dexterity)", 6, "20m", "--", 0.5, 15, null, null, "Blast 9, DM-2 to attacks in cloud", 131),
  weapon("stun-grenade", "Stun Grenade", "grenade", "Athletics (dexterity)", 7, "20m", "3D", 0.5, 30, null, null, "Blast 9, Stun", 131),

  /* ---------------- Heavy weapons (CRB p132) ---------------- */
  weapon("fghp-14", "FGHP-14", "heavy", HWP, 14, "450m", "2DD", 12, 100000, null, null, "Radiation, Very Bulky", 132),
  weapon("fghp-15", "FGHP-15", "heavy", HWP, 15, "450m", "2DD", 12, 400000, null, null, "Bulky, Radiation", 132),
  weapon("fghp-16", "FGHP-16", "heavy", HWP, 16, "450m", "2DD", 15, 500000, null, null, "Radiation", 132),
  weapon("grenade-launcher", "Grenade Launcher", "heavy", HWP, 7, "100m", "As grenade", 6, 400, "6", "as grenades", "Bulky", 132),
  weapon("machinegun", "Machinegun", "heavy", HWP, 6, "500m", "3D", 10, 1500, "60", "Cr100", "Auto 4", 132),
  weapon("pghp-12", "PGHP-12", "heavy", HWP, 12, "250m", "1DD", 10, 20000, null, null, "Very Bulky", 132),
  weapon("pghp-13", "PGHP-13", "heavy", HWP, 13, "450m", "1DD", 10, 65000, null, null, "Bulky", 132),
  weapon("pghp-14", "PGHP-14", "heavy", HWP, 14, "450m", "1DD", 10, 100000, null, null, null, 132),
  weapon("ram-grenade-launcher", "RAM Grenade Launcher", "heavy", HWP, 8, "250m", "As grenade", 2, 800, "6", "as grenades", "Auto 3, Bulky", 132),
  weapon("rocket-launcher-tl6", "Rocket Launcher (TL6)", "heavy", HWP, 6, "120m", "4D", 8, 2000, "1", "Cr300", "Blast 6", 132),
  weapon("rocket-launcher-tl7", "Rocket Launcher (TL7)", "heavy", HWP, 7, "150m", "4D+3", 8, 2000, "1", "Cr400", "Blast 6, Smart", 132),
  weapon("rocket-launcher-tl8", "Rocket Launcher (TL8)", "heavy", HWP, 8, "200m", "5D", 8, 2000, "2", "Cr600", "Blast 6, Scope, Smart", 132),
  weapon("rocket-launcher-tl9", "Rocket Launcher (TL9)", "heavy", HWP, 9, "250m", "5D+6", 8, 2000, "2", "Cr800", "Blast 6, Scope, Smart", 132),

  /* ---------------- Explosives (CRB p134) ---------------- */
  weapon("plastic", "Plastic", "grenade", "Explosives", 6, "--", "3D", undefined, 200, null, null, "Blast 9", 134),
  weapon("pocket-nuke", "Pocket Nuke", "grenade", "Explosives", 12, "--", "6DD", 4, 250000, null, null, "Blast 1000, Radiation", 134),
  weapon("tdx", "TDX", "grenade", "Explosives", 12, "--", "4D", undefined, 1000, null, null, "Blast 15", 134),

  /* ---------------- Weapon options (CRB p135) ---------------- */
  simple("auxiliary-grenade-launcher", "Auxiliary Grenade Launcher", "other", 7, 1000, undefined, "Weapon option: underslung, 1 grenade, rifles only", crb(135)),
  simple("gyrostabiliser", "Gyrostabiliser", "other", 9, 500, undefined, "Weapon option: removes Bulky", crb(135)),
  simple("intelligent-weapon-tl11", "Intelligent Weapon (TL11)", "other", 11, 1000, undefined, "Weapon option: Computer/0", crb(135)),
  simple("intelligent-weapon-tl13", "Intelligent Weapon (TL13)", "other", 13, 5000, undefined, "Weapon option: Computer/1", crb(135)),
  simple("laser-sight", "Laser Sight", "other", 8, 200, undefined, "Weapon option: DM+1 under 50m (TL10: invisible)", crb(135)),
  simple("scope", "Scope", "other", 5, 50, undefined, "Weapon option: Scope trait (TL7: low-light)", crb(135)),
  simple("secure-weapon", "Secure Weapon", "other", 10, 250, undefined, "Weapon option: user authentication", crb(135)),
  simple("suppressor", "Suppressor", "other", 8, 250, undefined, "Weapon option: non-automatic slug throwers", crb(135)),

  /* ---------------- Vehicles (CRB p137-148) ---------------- */
  vehicle("ground-car", "Ground Car", 8, "Drive (wheel)", "+0", "Medium (cruise Slow)", "400km (600)", 1, 3, "0.5t", 12, "2", "3t", 6500, false, 137),
  vehicle("air-raft", "Air/Raft", 8, "Flyer (grav)", "+1", "High (cruise Medium)", "1000km (1500)", 1, 5, "0.25t", 16, "10", "4t", 250000, false, 144, "Open; cargo version: Pass 0, Cargo 1.5t"),
  vehicle("atv", "ATV", 12, "Drive (wheel)", "-2", "High (cruise Medium)", "600km (900)", 1, 7, "2.5t", 60, "6", "10t", 155000, false, 144, "Aquatic drive, turret hardpoint (no weapon)"),
  vehicle("atv-tracked", "ATV (Tracked)", 12, "Drive (track)", "-2", "Medium (cruise Slow)", "600km (900)", 1, 7, "2.5t", 60, "6", "10t", 175000, false, 144, "Aquatic drive, turret hardpoint (no weapon)"),
  vehicle("brutus-heavy-cargo-truck", "Brutus Heavy Cargo Truck", 10, "Drive (wheel)", "-2", "Medium (cruise Slow)", "500km (750)", 1, 2, "12.5t", 180, "8", "40t", 241000, false, 145),
  vehicle("cargo-lifter", "Cargo Lifter", 8, "Drive (walker)", "+0", "Slow (cruise Very Slow)", "150km (225)", 1, 0, "0.25t", 12, "2", "3t", 70000, false, 145),
  vehicle("cargo-lifter-sealed", "Cargo Lifter (Sealed)", 8, "Drive (walker)", "+0", "Slow (cruise Very Slow)", "150km (225)", 1, 0, "0t", 12, "2", "3t", 140000, false, 145, "Short term life support, vacuum protection"),
  vehicle("g-bike", "G/Bike", 12, "Flyer (grav)", "+3", "Very Fast (cruise Fast)", "3000km (4500)", 1, 0, "0t", 2, "4", "0.5t", 46000, false, 146),
  vehicle("g-racer", "G/Racer", 9, "Flyer (grav)", "+2", "Subsonic (cruise Very Fast)", "2000km (3000)", 1, 1, "0t", 4, "3", "3t", 300000, false, 146, "Vacuum protection option +Cr30000"),
  vehicle("gecko-all-terrain-assault-vehicle", "Gecko All-Terrain Assault Vehicle", 7, "Drive (wheel)", "+0", "High (cruise Medium)", "300km (450)", 2, 3, "0t", 18, "12", "4.5t", 42450, true, 147, "Twin Light Autocannon (1km, 6D+6, Auto 3)"),
  vehicle("gunskiff", "Gunskiff", 10, "Flyer (grav)", "-1", "Slow (cruise Very Slow)", "1000km (1500)", 2, 4, "0t", 30, "3", "10t", 313750, true, 147, "Open; Laser Cannon (2.5km, 1DD, AP 10)"),
  vehicle("personal-land-yacht", "Personal Land Yacht", 3, "Drive (wheel)", "-1", "Very Slow (cruise Idle)", "-- (wind powered)", 1, 1, "0t", 2, "1", "1t", 600, false, 148),
  vehicle("g-carrier", "G/Carrier", 15, "Flyer (grav)", "-1", "Fast (cruise High)", "5000km (7500)", 2, 8, "0.75t", 90, "120 front, 100 rear, 80 sides", "15t", 11580000, true, 148, "Turret Fusion Gun (5km, 3DD, AP 20, Blast 20, Radiation)"),

  /* ---------------- Vehicle weapons (CRB p142); mass in kg ---------------- */
  weapon("cannon", "Cannon", "heavy", HWV, 8, "2km", "8D", 2500, 400000, "30", "Cr5000", "Blast 10", 142),
  weapon("heavy-machinegun", "Heavy Machinegun", "heavy", HWV, 6, "1km", "4D", 100, 4500, "100", "Cr400", "Auto 3", 142),
  weapon("laser-cannon", "Laser Cannon", "heavy", HWV, 9, "2.5km", "1DD", 6000, 100000, null, null, "AP 10", 142),
  weapon("light-autocannon", "Light Autocannon", "heavy", HWV, 6, "1km", "6D", 250, 10000, "500", "Cr1000", "Auto 3", 142),

  /* ---------------- Vehicle equipment (CRB p143) ---------------- */
  simple("vehicle-autopilot", "Autopilot (Vehicle)", "other", 5, 2000, undefined, "Vehicle equipment: skill 0, +Cr5000 per skill", crb(143)),
  simple("vehicle-communications-tl4", "Communications (Vehicle, TL4)", "other", 4, 500, undefined, "Vehicle equipment: range 5km", crb(143)),
  simple("vehicle-communications-tl6", "Communications (Vehicle, TL6)", "other", 6, 1000, undefined, "Vehicle equipment: range 50km", crb(143)),
  simple("vehicle-communications-tl8", "Communications (Vehicle, TL8)", "other", 8, 2000, undefined, "Vehicle equipment: range 500km", crb(143)),
  simple("vehicle-communications-tl15", "Communications (Vehicle, TL15)", "other", 15, 4000, 500, "Vehicle equipment: range 5000km", crb(143)),
  simple("vehicle-entertainment-system", "Entertainment System (Vehicle)", "other", 5, 200, undefined, "Vehicle equipment", crb(143)),
  simple("vehicle-navigation-basic", "Navigation (Basic)", "other", 5, 2000, undefined, "Vehicle equipment: Navigation DM+1", crb(143)),
  simple("vehicle-navigation-improved", "Navigation (Improved)", "other", 9, 10000, undefined, "Vehicle equipment: Navigation DM+2", crb(143)),
  simple("vehicle-navigation-advanced", "Navigation (Advanced)", "other", 13, 50000, undefined, "Vehicle equipment: Navigation DM+3", crb(143)),
  simple("vehicle-sensors-basic", "Sensors (Basic)", "other", 5, 5000, undefined, "Vehicle equipment: range 1km", crb(143)),
  simple("vehicle-sensors-improved", "Sensors (Improved)", "other", 8, 15000, undefined, "Vehicle equipment: Electronics (sensors) DM+1, 5km", crb(143)),
  simple("vehicle-sensors-advanced", "Sensors (Advanced)", "other", 12, 25000, 250, "Vehicle equipment: Electronics (sensors) DM+2, 25km", crb(143)),
  simple("vehicle-short-term-life-support", "Short Term Life Support (Vehicle)", "other", 4, 10000, undefined, "Vehicle equipment: per person, one day", crb(143)),
];

/* ------------------------------------------------------------------ */
/* Ships and small craft                                               */
/* ------------------------------------------------------------------ */

export interface ShipRef {
  id: string;
  name: string;
  type: string;
  tons: number;
  costMCr: number;
  source: Source;
}

/** Ships and small craft named by benefits: Free Trader, Far Trader, Lab Ship (Laboratory Ship), Yacht, Safari Ship, Scout (Scout/Courier), Ship's Boat and the other small craft (Light Fighter, Gig, Launch, Slow Boat, Pinnace, Slow Pinnace, Modular Cutter, Shuttle, Passenger Shuttle). Cost = the book's purchase cost in MCr. */
export const SHIPS: ShipRef[] = [
  { id: "scout", name: "Scout/Courier", type: "ship", tons: 100, costMCr: 36.9405, source: crb(190) },
  { id: "seeker-mining-ship", name: "Seeker Mining Ship", type: "ship", tons: 100, costMCr: 33.8355, source: crb(192) },
  { id: "free-trader", name: "Free Trader", type: "ship", tons: 200, costMCr: 46.332, source: crb(194) },
  { id: "far-trader", name: "Far Trader", type: "ship", tons: 200, costMCr: 53.3205, source: crb(196) },
  { id: "safari-ship", name: "Safari Ship", type: "ship", tons: 200, costMCr: 61.5303, source: crb(198) },
  { id: "system-defence-boat", name: "System Defence Boat", type: "ship", tons: 200, costMCr: 134.217, source: crb(200) },
  { id: "yacht", name: "Yacht", type: "ship", tons: 200, costMCr: 67.007, source: crb(202) },
  { id: "close-escort", name: "Close Escort", type: "ship", tons: 400, costMCr: 249.0003, source: crb(204) },
  { id: "lab-ship", name: "Laboratory Ship", type: "ship", tons: 400, costMCr: 136.3743, source: crb(206) },
  { id: "patrol-corvette", name: "Patrol Corvette", type: "ship", tons: 400, costMCr: 184.4568, source: crb(208) },
  { id: "subsidised-merchant", name: "Subsidised Merchant", type: "ship", tons: 400, costMCr: 78.3423, source: crb(210) },
  { id: "survey-scout", name: "Survey Scout", type: "ship", tons: 400, costMCr: 152.3583, source: crb(212) },
  { id: "subsidised-liner", name: "Subsidised Liner", type: "ship", tons: 600, costMCr: 158.3163, source: crb(214) },
  { id: "mercenary-cruiser", name: "Mercenary Cruiser", type: "ship", tons: 800, costMCr: 292.4646, source: crb(216) },
  { id: "light-fighter", name: "Light Fighter", type: "small craft", tons: 10, costMCr: 9.09, source: crb(218) },
  { id: "gig", name: "Gig", type: "small craft", tons: 20, costMCr: 7.272, source: crb(219) },
  { id: "launch", name: "Launch", type: "small craft", tons: 20, costMCr: 2.367, source: crb(220) },
  { id: "ships-boat", name: "Ship's Boat", type: "small craft", tons: 30, costMCr: 7.092, source: crb(221) },
  { id: "slow-boat", name: "Slow Boat", type: "small craft", tons: 30, costMCr: 4.842, source: crb(222) },
  { id: "pinnace", name: "Pinnace", type: "small craft", tons: 40, costMCr: 8.712, source: crb(223) },
  { id: "slow-pinnace", name: "Slow Pinnace", type: "small craft", tons: 40, costMCr: 5.787, source: crb(224) },
  { id: "modular-cutter", name: "Modular Cutter", type: "small craft", tons: 50, costMCr: 10.107, source: crb(225) },
  { id: "shuttle", name: "Shuttle", type: "small craft", tons: 95, costMCr: 15.147, source: crb(226) },
  { id: "passenger-shuttle", name: "Passenger Shuttle", type: "small craft", tons: 95, costMCr: 9.927, source: crb(227) },
];
