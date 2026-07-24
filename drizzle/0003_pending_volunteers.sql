-- Pathway-gated volunteer pending queue for team leaders
CREATE TABLE IF NOT EXISTS "pending_volunteers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submission_id" uuid REFERENCES "submissions"("id"),
  "pco_person_id" varchar(64) NOT NULL,
  "pco_team_id" varchar(64) DEFAULT '' NOT NULL,
  "team_key" varchar(64) NOT NULL,
  "person_name" text,
  "person_email" varchar(320),
  "answers_json" jsonb,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "accepted_position_id" varchar(64),
  "accepted_at" timestamp with time zone,
  "reviewed_by_email" varchar(320),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "pending_volunteers_team_status_idx"
  ON "pending_volunteers" ("pco_team_id", "team_key", "status");
