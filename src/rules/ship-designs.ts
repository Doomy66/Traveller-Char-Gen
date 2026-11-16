import data from "./ship-designs.json";

/**
 * Every ship the Traveller Ship Designer ships with (its High Guard fixtures
 * and its catalogue), with the crew its engine gives each one. Generated into
 * ship-designs.json by scripts/vendor-ship-designer.mjs. CharSpec 12.8.
 */
export interface DesignerShip {
  name: string;
  tons: number;
  military: boolean;
  group: string;
  /** Crew by post id. */
  counts: Record<string, number>;
}

export const SHIP_DESIGNER_VERSION: string = data.designer;
export const DESIGNER_SHIPS = data.ships as unknown as DesignerShip[];
