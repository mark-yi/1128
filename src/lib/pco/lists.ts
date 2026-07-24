/**
 * People Lists helpers (optional).
 *
 * Membership promotion happens on team Accept — no Pathway list required.
 * Keep these if you later want cohort filters / automations.
 */

import {
  isPcoConfigured,
  pcoListAll,
  pcoRequest,
  qs,
  type PcoListResponse,
} from "./http";
import type { PcoPerson } from "./types";
import { getPerson } from "./people";

export function getPathwayListId(): string | null {
  return process.env.PCO_PATHWAY_LIST_ID?.trim() || null;
}

/** True if person appears in the given People list results. */
export async function isPersonOnList(
  listId: string,
  personId: string,
): Promise<boolean> {
  if (!isPcoConfigured() || !listId || !personId) return false;

  const res = await pcoRequest<PcoListResponse>(
    "people",
    `/lists/${listId}/list_results${qs({
      "where[person_id]": personId,
      per_page: 1,
    })}`,
  );

  return (res.data?.length ?? 0) > 0;
}

/** People currently on a list (Pathway grads, etc.). */
export async function listPeopleOnList(
  listId: string,
  options?: { maxPages?: number },
): Promise<PcoPerson[]> {
  if (!isPcoConfigured() || !listId) return [];

  const rows = await pcoListAll<{ created_at?: string }>(
    "people",
    `/lists/${listId}/list_results`,
    {
      perPage: 100,
      maxPages: options?.maxPages ?? 10,
      query: { include: "person" },
    },
  );

  const people: PcoPerson[] = [];
  for (const row of rows) {
    const rel = row.relationships?.person?.data;
    const personId = !Array.isArray(rel) && rel ? rel.id : null;
    if (!personId) continue;
    const person = await getPerson(personId);
    if (person) people.push(person);
  }
  return people;
}

export async function isOnPathwayList(personId: string): Promise<boolean> {
  const listId = getPathwayListId();
  if (!listId) return false;
  return isPersonOnList(listId, personId);
}
