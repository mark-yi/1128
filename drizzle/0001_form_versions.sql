-- Add versioning + snapshot columns for generalized form ledger
alter table forms add column if not exists schema_version integer not null default 1;
alter table forms add column if not exists version integer not null default 1;
alter table forms add column if not exists updated_at timestamptz not null default now();

alter table submissions add column if not exists form_schema_version integer not null default 1;
alter table submissions add column if not exists form_version integer not null default 1;
alter table submissions add column if not exists form_snapshot_json jsonb;
alter table submissions add column if not exists contact_json jsonb;

create index if not exists submissions_form_version_idx on submissions (form_slug, form_version);
