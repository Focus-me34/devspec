-- devSpec initial schema. Paste into the Neon SQL Editor and Run.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists users_email_idx on users (email);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now()
);
create unique index if not exists members_team_user_idx on members (team_id, user_id);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists projects_team_idx on projects (team_id);

create table if not exists features (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  ref integer not null,
  title text not null,
  status text not null default 'discussion'
    check (status in ('discussion','specified','building','review','deployed','dropped')),
  owner_name text,
  branch_url text,
  blocked boolean not null default false,
  blocked_reason text,
  answers jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists features_project_idx on features (project_id, updated_at desc);
create unique index if not exists features_ref_idx on features (project_id, ref);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references features(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_feature_idx on notes (feature_id, created_at);

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references features(id) on delete cascade,
  actor_name text not null,
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_feature_idx on activity (feature_id, created_at);

-- One row per registration attempt, successful or not. Only used to rate
-- limit signups per IP, so nothing here is worth keeping: rows older than a
-- day are swept on write.
create table if not exists signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_idx on signup_attempts (ip, created_at);

-- ---------------------------------------------------------------------------
-- THE GATE. This is the product. It lives in the database so that no client,
-- no stray API call and no future refactor can route around it.
-- ---------------------------------------------------------------------------

create or replace function enforce_spec_gate() returns trigger as $$
declare
  q text;
  required text[] := array['who','flow','fail','out','breaks'];
  checks jsonb;
begin
  -- 'dropped' is the escape hatch: you must be able to kill a vague idea.
  if new.status not in ('discussion','dropped') then
    foreach q in array required loop
      if coalesce(btrim(new.answers ->> q), '') = '' then
        raise exception 'SPEC_GATE: cannot leave Discussion, "%" is unanswered', q;
      end if;
    end loop;

    checks := coalesce(new.answers -> 'check', '[]'::jsonb);
    if jsonb_array_length(checks) = 0
       or not exists (
         select 1 from jsonb_array_elements_text(checks) c where btrim(c) <> ''
       ) then
      raise exception 'SPEC_GATE: cannot leave Discussion, add at least one acceptance check';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists features_spec_gate on features;
create trigger features_spec_gate
  before insert or update on features
  for each row execute function enforce_spec_gate();
