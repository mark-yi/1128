-- 1128 forms ledger (schemaVersion 1)

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  slug varchar(64) not null unique,
  title text not null,
  schema_version integer not null default 1,
  version integer not null default 1,
  schema_json jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  form_id varchar(64) not null,
  form_slug varchar(64) not null,
  form_schema_version integer not null default 1,
  form_version integer not null default 1,
  form_snapshot_json jsonb,
  answers_json jsonb not null,
  contact_json jsonb,
  email varchar(320),
  name text,
  phone varchar(64),
  pco_person_id varchar(64),
  status varchar(32) not null default 'received',
  idempotency_key varchar(128) unique,
  created_at timestamptz not null default now()
);

create table if not exists email_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id),
  template varchar(64) not null,
  resend_id varchar(128),
  status varchar(32) not null,
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists submissions_created_at_idx on submissions (created_at desc);
create index if not exists submissions_form_slug_idx on submissions (form_slug);
create index if not exists submissions_form_version_idx on submissions (form_slug, form_version);
