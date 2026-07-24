import {
  includedById,
  isPcoConfigured,
  pcoListAll,
  pcoRequest,
  qs,
  type PcoJsonApiResource,
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

function relatedIds(
  resource: PcoJsonApiResource,
  relationship: string,
): string[] {
  const rel = resource.relationships?.[relationship]?.data;
  if (!rel) return [];
  return Array.isArray(rel) ? rel.map((r) => r.id) : [rel.id];
}

function primaryContact<T extends { primary?: boolean }>(
  included: Array<PcoJsonApiResource> | undefined,
  type: string,
  ids: string[],
): T | undefined {
  const rows = ids
    .map((id) => includedById(included, type, id))
    .filter(Boolean)
    .map((r) => r!.attributes as T);
  return rows.find((r) => r.primary) ?? rows[0];
}

function contactsForPerson(
  person: PcoJsonApiResource<PersonAttrs>,
  included: Array<PcoJsonApiResource> | undefined,
): { email?: string; phone?: string } {
  const email = primaryContact<EmailAttrs>(
    included,
    "Email",
    relatedIds(person, "emails"),
  )?.address;
  const phone = primaryContact<PhoneAttrs>(
    included,
    "PhoneNumber",
    relatedIds(person, "phone_numbers"),
  )?.number;
  return { email, phone };
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
    const { email, phone } = contactsForPerson(person, res.included);
    return mapPerson(person, email, phone);
  });
}

export async function getPerson(personId: string): Promise<PcoPerson | null> {
  if (!isPcoConfigured()) return null;
  const res = await pcoRequest<PcoSingleResponse<PersonAttrs>>(
    "people",
    `/people/${personId}${qs({ include: "emails,phone_numbers" })}`,
  );
  if (!res.data) return null;

  const { email, phone } = contactsForPerson(res.data, res.included);
  return mapPerson(res.data, email, phone);
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

/** Live API requires note_category_id (422 without it). */
async function resolveNoteCategoryId(): Promise<string | null> {
  const fromEnv = process.env.PCO_NOTE_CATEGORY_ID?.trim();
  if (fromEnv) return fromEnv;

  const res = await pcoRequest<
    PcoListResponse<{ name?: string }>
  >("people", `/note_categories${qs({ per_page: 100 })}`);
  const rows = res.data ?? [];
  const general = rows.find(
    (r) => (r.attributes.name ?? "").toLowerCase() === "general",
  );
  return general?.id ?? rows[0]?.id ?? null;
}

async function createPersonNote(
  personId: string,
  source: string,
  stage: string,
  notes: string,
) {
  try {
    const noteCategoryId = await resolveNoteCategoryId();
    if (!noteCategoryId) {
      console.warn("[pco] note create skipped: no note category available");
      return;
    }

    await pcoRequest("people", `/people/${personId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "Note",
          attributes: {
            note: `[${source} / ${stage}]\n${notes}`,
            note_category_id: noteCategoryId,
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
    const { email, phone } = contactsForPerson(person, res.included);
    return mapPerson(person, email, phone);
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
