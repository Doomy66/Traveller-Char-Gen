import { parse, sheet } from "../vendor/ship-designer.js";

/**
 * Reading a design saved by the Traveller Ship Designer (a `.ship` file) and
 * taking its crew from the designer's own engine, bundled into
 * src/vendor by scripts/vendor-ship-designer.mjs. Loaded only when a file is
 * opened. CharSpec 12.8.
 */

/** The designer's crew roles, as this project's crew posts. */
export const DESIGNER_POSTS: Readonly<Record<string, string>> = {
  captain: "captain",
  pilot: "pilot",
  astrogator: "astrogator",
  engineer: "engineer",
  maintenance: "maintenance",
  gunner: "gunner",
  steward: "steward",
  administrator: "administrator",
  sensorOperator: "sensor-operator",
  medic: "medic",
  officer: "officer",
};

export interface ImportedCrew {
  name: string;
  tons: number;
  military: boolean;
  counts: Record<string, number>;
}

/** The crew of a design given as `.ship` text. Throws if it is not a design. */
export function crewFromDesign(text: string): ImportedCrew {
  const design = parse(text);
  if (!design) throw new Error("it has no hull and power plant");
  const counts: Record<string, number> = {};
  for (const c of sheet(design).crew) {
    const post = DESIGNER_POSTS[c.role];
    if (!post) throw new Error(`no crew post for the designer's role "${c.role}"`);
    counts[post] = (counts[post] ?? 0) + c.count;
  }
  return { name: design.name, tons: design.hull.tons, military: design.military === true, counts };
}
