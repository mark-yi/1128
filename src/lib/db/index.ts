import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type {
  Answers,
  Contact,
  FormDefinition,
} from "@/lib/forms/schema";
import type { PendingVolunteer, Submission } from "./schema";

export type StoredSubmission = {
  id: string;
  formSlug: string;
  formSchemaVersion: number;
  formVersion: number;
  formSnapshotJson: FormDefinition | null;
  answersJson: Answers;
  contactJson: Contact | null;
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

export type StoredPendingVolunteer = {
  id: string;
  submissionId: string | null;
  pcoPersonId: string;
  pcoTeamId: string;
  teamKey: string;
  personName: string | null;
  personEmail: string | null;
  answersJson: Answers | null;
  status: string;
  acceptedPositionId: string | null;
  acceptedAt: Date | null;
  reviewedByEmail: string | null;
  createdAt: Date;
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
  pendingVolunteers: [] as StoredPendingVolunteer[],
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
  formSchemaVersion: number;
  formVersion: number;
  formSnapshot: FormDefinition;
  answers: Answers;
  contact: Contact;
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
      formSchemaVersion: input.formSchemaVersion,
      formVersion: input.formVersion,
      formSnapshotJson: input.formSnapshot,
      answersJson: input.answers,
      contactJson: input.contact,
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
      formSchemaVersion: input.formSchemaVersion,
      formVersion: input.formVersion,
      formSnapshotJson: input.formSnapshot,
      answersJson: input.answers,
      contactJson: input.contact,
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

export async function insertPendingVolunteers(
  rows: Array<{
    submissionId: string;
    pcoPersonId: string;
    pcoTeamId: string;
    teamKey: string;
    personName: string;
    personEmail: string;
    answers: Answers;
  }>,
): Promise<StoredPendingVolunteer[]> {
  if (rows.length === 0) return [];

  const db = getDb();
  if (!db) {
    const created = rows.map((input) => {
      const row: StoredPendingVolunteer = {
        id: newId(),
        submissionId: input.submissionId,
        pcoPersonId: input.pcoPersonId,
        pcoTeamId: input.pcoTeamId,
        teamKey: input.teamKey,
        personName: input.personName || null,
        personEmail: input.personEmail || null,
        answersJson: input.answers,
        status: "pending",
        acceptedPositionId: null,
        acceptedAt: null,
        reviewedByEmail: null,
        createdAt: new Date(),
      };
      memory.pendingVolunteers.unshift(row);
      return row;
    });
    return created;
  }

  const inserted = await db
    .insert(schema.pendingVolunteers)
    .values(
      rows.map((input) => ({
        submissionId: input.submissionId,
        pcoPersonId: input.pcoPersonId,
        pcoTeamId: input.pcoTeamId,
        teamKey: input.teamKey,
        personName: input.personName || null,
        personEmail: input.personEmail || null,
        answersJson: input.answers,
        status: "pending",
      })),
    )
    .returning();

  return inserted.map(mapPending);
}

export async function listPendingVolunteersForTeam(input: {
  pcoTeamId?: string;
  teamKey?: string;
  status?: string;
  limit?: number;
}): Promise<StoredPendingVolunteer[]> {
  const status = input.status ?? "pending";
  const limit = input.limit ?? 100;
  const db = getDb();

  if (!db) {
    return memory.pendingVolunteers
      .filter((row) => {
        if (row.status !== status) return false;
        if (input.pcoTeamId && row.pcoTeamId === input.pcoTeamId) return true;
        if (input.teamKey && row.teamKey === input.teamKey) return true;
        if (!input.pcoTeamId && !input.teamKey) return true;
        return false;
      })
      .slice(0, limit);
  }

  const { eq, or, and, desc } = await import("drizzle-orm");
  const filters = [eq(schema.pendingVolunteers.status, status)];

  if (input.pcoTeamId && input.teamKey) {
    filters.push(
      or(
        eq(schema.pendingVolunteers.pcoTeamId, input.pcoTeamId),
        eq(schema.pendingVolunteers.teamKey, input.teamKey),
      )!,
    );
  } else if (input.pcoTeamId) {
    filters.push(eq(schema.pendingVolunteers.pcoTeamId, input.pcoTeamId));
  } else if (input.teamKey) {
    filters.push(eq(schema.pendingVolunteers.teamKey, input.teamKey));
  }

  const rows = await db
    .select()
    .from(schema.pendingVolunteers)
    .where(and(...filters))
    .orderBy(desc(schema.pendingVolunteers.createdAt))
    .limit(limit);

  return rows.map(mapPending);
}

export async function getPendingVolunteer(
  id: string,
): Promise<StoredPendingVolunteer | null> {
  const db = getDb();
  if (!db) {
    return memory.pendingVolunteers.find((p) => p.id === id) ?? null;
  }
  const { eq } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(schema.pendingVolunteers)
    .where(eq(schema.pendingVolunteers.id, id))
    .limit(1);
  return rows[0] ? mapPending(rows[0]) : null;
}

export async function updatePendingVolunteerStatus(input: {
  id: string;
  status: "accepted" | "dismissed";
  reviewedByEmail: string;
  acceptedPositionId?: string | null;
}): Promise<StoredPendingVolunteer | null> {
  const db = getDb();
  const acceptedAt = input.status === "accepted" ? new Date() : null;

  if (!db) {
    const row = memory.pendingVolunteers.find((p) => p.id === input.id);
    if (!row) return null;
    row.status = input.status;
    row.reviewedByEmail = input.reviewedByEmail;
    row.acceptedPositionId = input.acceptedPositionId ?? null;
    row.acceptedAt = acceptedAt;
    return row;
  }

  const { eq } = await import("drizzle-orm");
  const updated = await db
    .update(schema.pendingVolunteers)
    .set({
      status: input.status,
      reviewedByEmail: input.reviewedByEmail,
      acceptedPositionId: input.acceptedPositionId ?? null,
      acceptedAt,
    })
    .where(eq(schema.pendingVolunteers.id, input.id))
    .returning();

  return updated[0] ? mapPending(updated[0]) : null;
}

function mapRow(row: Submission): StoredSubmission {
  return {
    id: row.id,
    formSlug: row.formSlug,
    formSchemaVersion: row.formSchemaVersion,
    formVersion: row.formVersion,
    formSnapshotJson: (row.formSnapshotJson as FormDefinition | null) ?? null,
    answersJson: row.answersJson as Answers,
    contactJson: (row.contactJson as Contact | null) ?? null,
    email: row.email,
    name: row.name,
    phone: row.phone,
    pcoPersonId: row.pcoPersonId,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
  };
}

function mapPending(row: PendingVolunteer): StoredPendingVolunteer {
  return {
    id: row.id,
    submissionId: row.submissionId,
    pcoPersonId: row.pcoPersonId,
    pcoTeamId: row.pcoTeamId,
    teamKey: row.teamKey,
    personName: row.personName,
    personEmail: row.personEmail,
    answersJson: (row.answersJson as Answers | null) ?? null,
    status: row.status,
    acceptedPositionId: row.acceptedPositionId,
    acceptedAt: row.acceptedAt,
    reviewedByEmail: row.reviewedByEmail,
    createdAt: row.createdAt,
  };
}

export function isUsingMemoryStore() {
  return !hasDatabase();
}
