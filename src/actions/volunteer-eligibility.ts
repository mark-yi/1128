"use server";

import { assertVolunteerEligible } from "@/lib/pco/eligibility";
import type { PcoPerson } from "@/lib/pco/types";

export type CheckVolunteerEligibilityResult =
  | {
      ok: true;
      person: {
        id: string;
        firstName: string;
        lastName: string;
        name: string;
        email?: string;
      };
      mocked: boolean;
    }
  | { ok: false; message: string };

export async function checkVolunteerEligibilityAction(
  email: string,
): Promise<CheckVolunteerEligibilityResult> {
  const result = await assertVolunteerEligible(email);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  return {
    ok: true,
    mocked: result.mocked,
    person: slimPerson(result.person),
  };
}

function slimPerson(person: PcoPerson) {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    name: person.name,
    email: person.email,
  };
}
