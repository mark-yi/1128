import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Answers } from "@/lib/forms/schema";
import type { Submission } from "./schema";

export type StoredSubmission = {
  id: string;
  formSlug: string;
  answersJson: Answers;
  email: string | null;
  name: string | null;
  phone: string | null;
  pcoPersonId: string | null;
  status: string;
  idempotencyKey: string | null;
  createdAt: Date;
  emailStatus?: string | null;
  emailTemplate?: string | null;
};

const memory = {
  submissions: [] as StoredSubmission[],
  emailEvents: [] as {
    id: string;
    submissionId: string;
    template: string;
    resendId: string | null;
    status: string;
    error: string | null;
    sentAt: Date;
  }[],
  byIdempotency: new Map<string, string>(),
};

function hasDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url);
}

export function getDb() {
  // Lazy init only — never call neon() at module scope (breaks `next build`
  // when DATABASE_URL is missing on first Vercel deploy).
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const sql = neon(url);
  return drizzle(sql, { schema });
}

function newId() {
  return crypto.randomUUID();
}

export async function findSubmissionByIdempotencyKey(
  key: string,
): Promise<StoredSubmission | null> {
  if (!key) return null;
  const db = getDb();
  if (!db) {
    const id = memory.byIdempotency.get(key);
    return memory.submissions.find((s) => s.id === id) ?? null;
  }

  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(schema.submissions)
    .where(eq(schema.submissions.idempotencyKey, key))
    .limit(1);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function insertSubmission(input: {
  formSlug: string;
  answers: Answers;
  email: string;
  name: string;
  phone: string;
  pcoPersonId: string | null;
  status: string;
  idempotencyKey: string;
}): Promise<StoredSubmission> {
  const db = getDb();
  if (!db) {
    const row: StoredSubmission = {
      id: newId(),
      formSlug: input.formSlug,
      answersJson: input.answers,
      email: input.email || null,
      name: input.name || null,
      phone: input.phone || null,
      pcoPersonId: input.pcoPersonId,
      status: input.status,
      idempotencyKey: input.idempotencyKey,
      createdAt: new Date(),
    };
    memory.submissions.unshift(row);
    memory.byIdempotency.set(input.idempotencyKey, row.id);
    return row;
  }

  const inserted = await db
    .insert(schema.submissions)
    .values({
      formId: input.formSlug,
      formSlug: input.formSlug,
      answersJson: input.answers,
      email: input.email || null,
      name: input.name || null,
      phone: input.phone || null,
      pcoPersonId: input.pcoPersonId,
      status: input.status,
      idempotencyKey: input.idempotencyKey,
    })
    .returning();

  return mapRow(inserted[0]);
}

export async function insertEmailEvent(input: {
  submissionId: string;
  template: string;
  resendId: string | null;
  status: string;
  error?: string | null;
}) {
  const db = getDb();
  if (!db) {
    memory.emailEvents.unshift({
      id: newId(),
      submissionId: input.submissionId,
      template: input.template,
      resendId: input.resendId,
      status: input.status,
      error: input.error ?? null,
      sentAt: new Date(),
    });
    const sub = memory.submissions.find((s) => s.id === input.submissionId);
    if (sub) {
      sub.emailStatus = input.status;
      sub.emailTemplate = input.template;
    }
    return;
  }

  await db.insert(schema.emailEvents).values({
    submissionId: input.submissionId,
    template: input.template,
    resendId: input.resendId,
    status: input.status,
    error: input.error ?? null,
  });
}

export async function listSubmissions(limit = 50): Promise<StoredSubmission[]> {
  const db = getDb();
  if (!db) {
    return memory.submissions.slice(0, limit).map((s) => {
      const event = memory.emailEvents.find((e) => e.submissionId === s.id);
      return {
        ...s,
        emailStatus: event?.status ?? s.emailStatus ?? null,
        emailTemplate: event?.template ?? s.emailTemplate ?? null,
      };
    });
  }

  const { eq, desc } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(schema.submissions)
    .orderBy(desc(schema.submissions.createdAt))
    .limit(limit);

  const mapped = rows.map(mapRow);

  const withEmail = await Promise.all(
    mapped.map(async (row) => {
      const events = await db
        .select()
        .from(schema.emailEvents)
        .where(eq(schema.emailEvents.submissionId, row.id))
        .orderBy(desc(schema.emailEvents.sentAt))
        .limit(1);
      return {
        ...row,
        emailStatus: events[0]?.status ?? null,
        emailTemplate: events[0]?.template ?? null,
      };
    }),
  );

  return withEmail;
}

function mapRow(row: Submission): StoredSubmission {
  return {
    id: row.id,
    formSlug: row.formSlug,
    answersJson: row.answersJson as Answers,
    email: row.email,
    name: row.name,
    phone: row.phone,
    pcoPersonId: row.pcoPersonId,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
  };
}

export function isUsingMemoryStore() {
  return !hasDatabase();
}
