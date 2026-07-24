type PcoPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type UpsertInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source: string;
  stage: string;
  notes?: string;
};

function credentials() {
  const appId = process.env.PCO_APP_ID;
  const secret = process.env.PCO_SECRET;
  if (!appId || !secret) return null;
  return Buffer.from(`${appId}:${secret}`).toString("base64");
}

async function pcoFetch(path: string, init?: RequestInit) {
  const auth = credentials();
  if (!auth) throw new Error("PCO credentials missing");

  const res = await fetch(`https://api.planningcenteronline.com/people/v2${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PCO ${res.status}: ${body.slice(0, 300)}`);
  }

  return res.json();
}

export function isPcoConfigured() {
  return Boolean(credentials());
}

export async function upsertPerson(input: UpsertInput): Promise<{
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

  let existing: PcoPerson | null = null;

  if (input.email) {
    const search = await pcoFetch(
      `/people?where[search_name_or_email]=${encodeURIComponent(input.email)}&per_page=5`,
    );
    const match = (search.data ?? []).find(
      (person: {
        id: string;
        attributes?: { first_name?: string; last_name?: string };
      }) => Boolean(person?.id),
    );
    if (match) {
      existing = {
        id: match.id,
        firstName: match.attributes?.first_name ?? "",
        lastName: match.attributes?.last_name ?? "",
        email: input.email,
      };
    }
  }

  if (existing) {
    await pcoFetch(`/people/${existing.id}`, {
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

    // Best-effort custom fields / notes via person notes if provided
    if (input.notes) {
      try {
        await pcoFetch(`/people/${existing.id}/notes`, {
          method: "POST",
          body: JSON.stringify({
            data: {
              type: "Note",
              attributes: {
                note: `[${input.source} / ${input.stage}]\n${input.notes}`,
              },
            },
          }),
        });
      } catch (err) {
        console.warn("[pco] note create skipped", err);
      }
    }

    return { personId: existing.id, created: false, mocked: false };
  }

  const created = await pcoFetch("/people", {
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

  const personId = created.data.id as string;

  if (input.email) {
    await pcoFetch(`/people/${personId}/emails`, {
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
      await pcoFetch(`/people/${personId}/phone_numbers`, {
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
    try {
      await pcoFetch(`/people/${personId}/notes`, {
        method: "POST",
        body: JSON.stringify({
          data: {
            type: "Note",
            attributes: {
              note: `[${input.source} / ${input.stage}]\n${input.notes}`,
            },
          },
        }),
      });
    } catch (err) {
      console.warn("[pco] note create skipped", err);
    }
  }

  return { personId, created: true, mocked: false };
}

export function pcoPersonUrl(personId: string) {
  if (personId.startsWith("mock_")) return null;
  return `https://people.planningcenteronline.com/people/${personId}`;
}
