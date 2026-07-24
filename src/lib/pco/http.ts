/**
 * Shared Planning Center HTTP client (JSON:API).
 *
 * Auth: Personal Access Token via HTTP Basic (single-church).
 * Scopes needed for our product: People + Services on the PAT user.
 * Rate limit: ~100 req / 20s — we throttle + honor Retry-After.
 */

export type PcoJsonApiResource<TAttrs = Record<string, unknown>> = {
  type: string;
  id: string;
  attributes: TAttrs;
  relationships?: Record<
    string,
    { data: { type: string; id: string } | Array<{ type: string; id: string }> | null }
  >;
};

export type PcoListResponse<TAttrs = Record<string, unknown>> = {
  data: Array<PcoJsonApiResource<TAttrs>>;
  included?: Array<PcoJsonApiResource>;
  meta?: { total_count?: number; count?: number; next?: { offset?: number } };
  links?: { next?: string | null };
};

export type PcoSingleResponse<TAttrs = Record<string, unknown>> = {
  data: PcoJsonApiResource<TAttrs>;
  included?: Array<PcoJsonApiResource>;
};

export type PcoApp = "people" | "services";

const BASE = "https://api.planningcenteronline.com";

function credentials(): string | null {
  const appId = process.env.PCO_APP_ID?.trim();
  const secret = process.env.PCO_SECRET?.trim();
  if (!appId || !secret) return null;
  return Buffer.from(`${appId}:${secret}`).toString("base64");
}

export function isPcoConfigured() {
  return Boolean(credentials());
}

/** Simple in-process throttle so we stay under ~100/20s. */
let windowStart = Date.now();
let windowCount = 0;

async function throttle() {
  const now = Date.now();
  if (now - windowStart > 20_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= 90) {
    const wait = 20_000 - (now - windowStart) + 50;
    await new Promise((r) => setTimeout(r, Math.max(wait, 250)));
    windowStart = Date.now();
    windowCount = 0;
  }
  windowCount += 1;
}

export async function pcoRequest<T>(
  app: PcoApp,
  path: string,
  init?: RequestInit & { retries?: number },
): Promise<T> {
  const auth = credentials();
  if (!auth) {
    throw new Error("PCO credentials missing (set PCO_APP_ID + PCO_SECRET)");
  }

  const retries = init?.retries ?? 3;
  const url = path.startsWith("http")
    ? path
    : `${BASE}/${app}/v2${path.startsWith("/") ? path : `/${path}`}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle();

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "1128-Forms (https://github.com/mark-yi/1128)",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? "2");
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PCO ${app} ${res.status}: ${body.slice(0, 400)}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  throw new Error("PCO request failed after retries");
}

export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/** Fetch all pages (offset/per_page). Cap pages for safety. */
export async function pcoListAll<TAttrs>(
  app: PcoApp,
  path: string,
  options?: { perPage?: number; maxPages?: number; query?: Record<string, string | number | boolean | undefined> },
): Promise<Array<PcoJsonApiResource<TAttrs>>> {
  const perPage = options?.perPage ?? 100;
  const maxPages = options?.maxPages ?? 50;
  const out: Array<PcoJsonApiResource<TAttrs>> = [];
  let offset = 0;

  for (let page = 0; page < maxPages; page++) {
    const query = qs({
      ...(options?.query ?? {}),
      per_page: perPage,
      offset,
    });
    const sep = path.includes("?") ? "&" : "";
    const fullPath = path.includes("per_page=")
      ? path
      : `${path}${path.includes("?") ? sep : "?"}${query.replace(/^\?/, "")}`;

    const res = await pcoRequest<PcoListResponse<TAttrs>>(app, fullPath);
    out.push(...(res.data ?? []));
    if (!res.data?.length || res.data.length < perPage) break;
    offset += perPage;
  }

  return out;
}

export function includedByType(
  included: Array<PcoJsonApiResource> | undefined,
  type: string,
): Array<PcoJsonApiResource> {
  return (included ?? []).filter((item) => item.type === type);
}

export function includedById(
  included: Array<PcoJsonApiResource> | undefined,
  type: string,
  id: string,
): PcoJsonApiResource | undefined {
  return (included ?? []).find((item) => item.type === type && item.id === id);
}
