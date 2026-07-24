import {
  includedById,
  isPcoConfigured,
  pcoListAll,
  pcoRequest,
  qs,
  type PcoListResponse,
  type PcoSingleResponse,
} from "./http";
import type { PcoPerson } from "./types";

type PersonAttrs = {
  first_name?: string;
  last_name?: string;
  name?: string;
  status?: string;
  membership?: string;
};

type EmailAttrs = { address?: string; primary?: boolean; location?: string };
type PhoneAttrs = { number?: string; primary?: boolean; location?: string };

function mapPerson(
  resource: { id: string; attributes: PersonAttrs },
  email?: string,
  phone?: string,
): PcoPerson {
  return {
    id: resource.id,
    firstName: resource.attributes.first_name ?? "",
    lastName: resource.attributes.last_name ?? "",
    name:
      resource.attributes.name ||
      [resource.attributes.first_name, resource.attributes.last_name]
        .filter(Boolean)
        .join(" "),
    status: resource.attributes.status,
    membership: resource.attributes.membership,
    email,
    phone,
  };
}

export { isPcoConfigured };

export async function searchPeople(query: string, limit = 25): Promise<PcoPerson[]> {
  if (!isPcoConfigured()) return [];
  const res = await pcoRequest<PcoListResponse<PersonAttrs>>(
    "people",
    `/people${qs({
      "where[search_name_or_email]": query,
      per_page: Math.min(limit, 100),
      include: "emails,phone_numbers",
    })}`,
  );

  return (res.data ?? []).map((person) => {
    const email = (res.included ?? []).find(
      (item) =>
        item.type === "Email" &&
        // relationship matching is imperfect without deep links; take primary-ish
        true,
    ) as { attributes?: EmailAttrs } | undefined;

    // Prefer emails related via included when possible — fall back to first email in included set filtered by person later if needed
    const emails = (res.included ?? []).filter((i) => i.type === "Email");
    const phones = (res.included ?? []).filter((i) => i.type === "PhoneNumber");
    const primaryEmail =
      (emails.find((e) => (e.attributes as EmailAttrs)?.primary)?.attributes as EmailAttrs)
        ?.address ?? (emails[0]?.attributes as EmailAttrs | undefined)?.address;
    const primaryPhone =
      (phones.find((p) => (p.attributes as PhoneAttrs)?.primary)?.attributes as PhoneAttrs)
        ?.number ?? (phones[0]?.attributes as PhoneAttrs | undefined)?.number;

    void email;
    return mapPerson(person, primaryEmail, primaryPhone);
  });
}

export async function getPerson(personId: string): Promise<PcoPerson | null> {
  if (!isPcoConfigured()) return null;
  const res = await pcoRequest<PcoSingleResponse<PersonAttrs>>(
    "people",
    `/people/${personId}${qs({ include: "emails,phone_numbers" })}`,
  );
  if (!res.data) return null;

  const emails = (res.included ?? []).filter((i) => i.type === "Email");
  const phones = (res.included ?? []).filter((i) => i.type === "PhoneNumber");
  const primaryEmail =
    (emails.find((e) => (e.attributes as EmailAttrs)?.primary)?.attributes as EmailAttrs)
      ?.address ?? (emails[0]?.attributes as EmailAttrs | undefined)?.address;
  const primaryPhone =
    (phones.find((p) => (p.attributes as PhoneAttrs)?.primary)?.attributes as PhoneAttrs)
      ?.number ?? (phones[0]?.attributes as PhoneAttrs | undefined)?.number;

  return mapPerson(res.data, primaryEmail, primaryPhone);
}

export async function findPersonByEmail(email: string): Promise<PcoPerson | null> {
  if (!email || !isPcoConfigured()) return null;
  const matches = await searchPeople(email, 5);
  const exact = matches.find(
    (p) => p.email?.toLowerCase() === email.trim().toLowerCase(),
  );
  return exact ?? matches[0] ?? null;
}

export type UpsertPersonInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: string;
  stage: string;
  notes?: string;
};

/**
 * Create/update Person in People SoT. Used by form submit + leader tools.
 */
export async function upsertPerson(input: UpsertPersonInput): Promise<{
  personId: string;
  created: boolean;
  mocked: boolean;
}> {
  if (!isPcoConfigured()) {
    const mockId = `mock_${Buffer.from(input.email || input.firstName)
      .toString("base64url")
      .slice(0, 12)}`;
    console.info("[pco] mock upsert", { ...input, personId: mockId });
    return { personId: mockId, created: true, mocked: true };
  }

  const existing = input.email ? await findPersonByEmail(input.email) : null;

  if (existing) {
    await pcoRequest("people", `/people/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          type: "Person",
          id: existing.id,
          attributes: {
            first_name: input.firstName || existing.firstName,
            last_name: input.lastName || existing.lastName,
          },
        },
      }),
    });

    if (input.notes) {
      await createPersonNote(existing.id, input.source, input.stage, input.notes);
    }

    return { personId: existing.id, created: false, mocked: false };
  }

  const created = await pcoRequest<PcoSingleResponse<PersonAttrs>>("people", "/people", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "Person",
        attributes: {
          first_name: input.firstName,
          last_name: input.lastName,
        },
      },
    }),
  });

  const personId = created.data.id;

  if (input.email) {
    await pcoRequest("people", `/people/${personId}/emails`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "Email",
          attributes: {
            address: input.email,
            location: "Home",
            primary: true,
          },
        },
      }),
    });
  }

  if (input.phone) {
    try {
      await pcoRequest("people", `/people/${personId}/phone_numbers`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "PhoneNumber",
            attributes: {
              number: input.phone,
              location: "Mobile",
              primary: true,
            },
          },
        }),
      });
    } catch (err) {
      console.warn("[pco] phone create skipped", err);
    }
  }

  if (input.notes) {
    await createPersonNote(personId, input.source, input.stage, input.notes);
  }

  return { personId, created: true, mocked: false };
}

async function createPersonNote(
  personId: string,
  source: string,
  stage: string,
  notes: string,
) {
  try {
    await pcoRequest("people", `/people/${personId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "Note",
          attributes: {
            note: `[${source} / ${stage}]\n${notes}`,
          },
        },
      }),
    });
  } catch (err) {
    console.warn("[pco] note create skipped", err);
  }
}

export function pcoPersonUrl(personId: string) {
  if (personId.startsWith("mock_")) return null;
  return `https://people.planningcenteronline.com/people/${personId}`;
}

/** Recent people — useful for “new members” leader queues once filtered by list/tag. */
export async function listPeople(options?: {
  perPage?: number;
  offset?: number;
  order?: string;
}): Promise<PcoPerson[]> {
  if (!isPcoConfigured()) return [];
  const res = await pcoRequest<PcoListResponse<PersonAttrs>>(
    "people",
    `/people${qs({
      per_page: options?.perPage ?? 50,
      offset: options?.offset ?? 0,
      order: options?.order ?? "-created_at",
      include: "emails",
    })}`,
  );

  return (res.data ?? []).map((person) => {
    const emailRel = person.relationships?.emails?.data;
    const emailIds = Array.isArray(emailRel)
      ? emailRel.map((r) => r.id)
      : emailRel
        ? [emailRel.id]
        : [];
    const email =
      emailIds
        .map((id) => includedById(res.included, "Email", id))
        .find(Boolean)?.attributes as EmailAttrs | undefined;
    return mapPerson(person, email?.address);
  });
}

export async function listAllPeopleIds(maxPages = 20): Promise<string[]> {
  if (!isPcoConfigured()) return [];
  const rows = await pcoListAll<PersonAttrs>("people", "/people", {
    perPage: 100,
    maxPages,
    query: { order: "-created_at" },
  });
  return rows.map((r) => r.id);
}
