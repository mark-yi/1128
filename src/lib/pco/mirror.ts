/**
 * Optional local mirror for efficient leader UIs.
 *
 * PCO remains system of record. These tables are a read cache synced on a
 * schedule (or on-demand) so team-leader views don't fan out to PCO on every
 * page load. Not required for MVP — workflows can call Services live.
 *
 * Sync strategy (when wired):
 * 1. Cron / on admin open: pull service_types, teams, positions, upcoming plans
 * 2. Upsert by pco_*_id
 * 3. UI reads mirror; write actions always go to PCO first, then refresh mirror
 */

import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

export const pcoPeopleMirror = pgTable("pco_people_mirror", {
  id: uuid("id").defaultRandom().primaryKey(),
  pcoPersonId: varchar("pco_person_id", { length: 64 }).notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  status: varchar("status", { length: 32 }),
  membership: varchar("membership", { length: 64 }),
  rawJson: jsonb("raw_json"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pcoTeamsMirror = pgTable("pco_teams_mirror", {
  id: uuid("id").defaultRandom().primaryKey(),
  pcoTeamId: varchar("pco_team_id", { length: 64 }).notNull().unique(),
  pcoServiceTypeId: varchar("pco_service_type_id", { length: 64 }).notNull(),
  name: text("name").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pcoTeamPositionsMirror = pgTable("pco_team_positions_mirror", {
  id: uuid("id").defaultRandom().primaryKey(),
  pcoPositionId: varchar("pco_position_id", { length: 64 }).notNull().unique(),
  pcoTeamId: varchar("pco_team_id", { length: 64 }).notNull(),
  name: text("name").notNull(),
  sequence: integer("sequence"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pcoPlansMirror = pgTable("pco_plans_mirror", {
  id: uuid("id").defaultRandom().primaryKey(),
  pcoPlanId: varchar("pco_plan_id", { length: 64 }).notNull().unique(),
  pcoServiceTypeId: varchar("pco_service_type_id", { length: 64 }).notNull(),
  title: text("title"),
  dates: text("dates"),
  shortDates: text("short_dates"),
  sortDate: timestamp("sort_date", { withTimezone: true }),
  neededPositionsCount: integer("needed_positions_count"),
  planPeopleCount: integer("plan_people_count"),
  planningCenterUrl: text("planning_center_url"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});
