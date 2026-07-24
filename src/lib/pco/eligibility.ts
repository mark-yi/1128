/**
 * Volunteer form gate: person must already exist in Planning Center People.
 *
 * Real-world flow:
 * 1. Pathway class (still Newcomer / Regular Attender)
 * 2. Volunteer form (this gate — must be in PCO)
 * 3. Leader Accept → roster + membership promoted to Member
 *
 * Form link is shared with Pathway grads; we don't require Member status here.
 */

import { findPersonByEmail, getPerson, isPcoConfigured } from "./people";
import type { PcoPerson } from "./types";

export type VolunteerEligibility =
  | { ok: true; person: PcoPerson; mocked: boolean }
  | {
      ok: false;
      reason: "not_found";
      message: string;
      person?: PcoPerson;
    };

const MEMBERSHIP_OK = new Set(["member", "members"]);

export function isMemberStatus(membership?: string | null): boolean {
  if (!membership) return false;
  return MEMBERSHIP_OK.has(membership.trim().toLowerCase());
}

export async function assertVolunteerEligible(
  email: string,
): Promise<VolunteerEligibility> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return {
      ok: false,
      reason: "not_found",
      message: "Enter the email we have on file for you.",
    };
  }

  if (!isPcoConfigured()) {
    return {
      ok: true,
      mocked: true,
      person: {
        id: `mock_${Buffer.from(normalized).toString("base64url").slice(0, 12)}`,
        firstName: "",
        lastName: "",
        name: normalized,
        email: normalized,
      },
    };
  }

  let person = await findPersonByEmail(normalized);
  if (person && !person.email) {
    person = (await getPerson(person.id)) ?? person;
  }

  if (!person) {
    return {
      ok: false,
      reason: "not_found",
      message:
        "We couldn’t find you in our system. Finish Pathway first, then come back with the email we have on file.",
    };
  }

  return { ok: true, person, mocked: false };
}
