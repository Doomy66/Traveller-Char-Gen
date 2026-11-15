import type { Career, TableRow } from "../types";
import { agent } from "./agent";
import { army } from "./army";
import { citizen } from "./citizen";
import { drifter } from "./drifter";
import { entertainer } from "./entertainer";
import { marine } from "./marine";
import { merchant } from "./merchant";
import { navy } from "./navy";
import { noble } from "./noble";
import { prisoner } from "./prisoner";
import { psion } from "./psion";
import { rogue } from "./rogue";
import { scholar } from "./scholar";
import { scout } from "./scout";
import { GE_CAREERS, GE_ALT_TABLES } from "./ge";

/** Every career, CRB pp21-56 and 236, and Glorious Empire pp60-72. */
export const CAREERS: Career[] = [
  agent,
  army,
  citizen,
  drifter,
  entertainer,
  marine,
  merchant,
  navy,
  noble,
  rogue,
  scholar,
  scout,
  prisoner,
  psion,
  ...GE_CAREERS,
];

const BY_ID = new Map(CAREERS.map((c) => [c.id, c]));

export function findCareer(id: string): Career {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown career ${id}`);
  return c;
}

export function hasCareer(id: string): boolean {
  return BY_ID.has(id);
}

/** Tables that replace a career's own for one assignment (the Slave career's dog soldiers). */
export function tablesFor(career: Career, assignmentId: string): { events: TableRow[]; mishaps: TableRow[] } {
  const alt = GE_ALT_TABLES[`${career.id}/${assignmentId}`];
  return alt ?? { events: career.events, mishaps: career.mishaps };
}
