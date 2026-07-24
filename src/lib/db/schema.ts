import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const forms = pgTable("forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: text("title").notNull(),
  schemaJson: jsonb("schema_json").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: varchar("form_id", { length: 64 }).notNull(),
  formSlug: varchar("form_slug", { length: 64 }).notNull(),
  answersJson: jsonb("answers_json").notNull(),
  email: varchar("email", { length: 320 }),
  name: text("name"),
  phone: varchar("phone", { length: 64 }),
  pcoPersonId: varchar("pco_person_id", { length: 64 }),
  status: varchar("status", { length: 32 }).notNull().default("received"),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailEvents = pgTable("email_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id),
  template: varchar("template", { length: 64 }).notNull(),
  resendId: varchar("resend_id", { length: 128 }),
  status: varchar("status", { length: 32 }).notNull(),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type EmailEvent = typeof emailEvents.$inferSelect;
