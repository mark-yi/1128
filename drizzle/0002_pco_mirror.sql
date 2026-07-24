-- Optional PCO read-cache (Services/People remain SoT)
create table if not exists pco_people_mirror (
  id uuid primary key default gen_random_uuid(),
  pco_person_id varchar(64) not null unique,
  first_name text,
  last_name text,
  name text,
  email varchar(320),
  phone varchar(64),
  status varchar(32),
  membership varchar(64),
  raw_json jsonb,
  synced_at timestamptz not null default now()
);

create table if not exists pco_teams_mirror (
  id uuid primary key default gen_random_uuid(),
  pco_team_id varchar(64) not null unique,
  pco_service_type_id varchar(64) not null,
  name text not null,
  archived_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists pco_team_positions_mirror (
  id uuid primary key default gen_random_uuid(),
  pco_position_id varchar(64) not null unique,
  pco_team_id varchar(64) not null,
  name text not null,
  sequence integer,
  synced_at timestamptz not null default now()
);

create table if not exists pco_plans_mirror (
  id uuid primary key default gen_random_uuid(),
  pco_plan_id varchar(64) not null unique,
  pco_service_type_id varchar(64) not null,
  title text,
  dates text,
  short_dates text,
  sort_date timestamptz,
  needed_positions_count integer,
  plan_people_count integer,
  planning_center_url text,
  synced_at timestamptz not null default now()
);

create index if not exists pco_people_mirror_email_idx on pco_people_mirror (email);
create index if not exists pco_plans_mirror_sort_idx on pco_plans_mirror (sort_date);
