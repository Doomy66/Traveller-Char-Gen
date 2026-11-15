import type { Career, TableRow } from "../types";
import { geFleet } from "./ge-fleet";
import { geFleetOfficer } from "./ge-fleet-officer";
import { geLandlessOne } from "./ge-landless-one";
import { geDogSoldierTables, geSlave } from "./ge-slave";
import { geWarrior } from "./ge-warrior";
import { geWarriorOfficer } from "./ge-warrior-officer";

/** Glorious Empire careers, GE pp57-72. */
export const GE_CAREERS: Career[] = [geFleet, geFleetOfficer, geWarrior, geWarriorOfficer, geLandlessOne, geSlave];

/** Per-assignment replacement tables, keyed "careerId/assignmentId". */
export const GE_ALT_TABLES: Record<string, { events: TableRow[]; mishaps: TableRow[] }> = {
  "ge-slave/dog-soldier": geDogSoldierTables,
};
