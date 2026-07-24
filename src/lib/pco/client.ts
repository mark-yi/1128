/**
 * Compatibility surface for form submit + admin links.
 * Prefer importing from `./people`, `./services`, or `./workflows` in new code.
 */

export {
  isPcoConfigured,
  upsertPerson,
  pcoPersonUrl,
  searchPeople,
  getPerson,
  findPersonByEmail,
  listPeople,
  setPersonMembership,
} from "./people";

export type { UpsertPersonInput } from "./people";
