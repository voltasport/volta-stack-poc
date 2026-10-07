-- Invite tracking, onboarding checklist, director/manager requests, organizations.

alter table "user" add column if not exists invited_at timestamptz;
alter table "user" add column if not exists last_invite_sent_at timestamptz;
alter table "user" add column if not exists first_login_at timestamptz;
alter table "user" add column if not exists onboarding_dismissed_at timestamptz;
alter table "user" add column if not exists organization_slug text;

create table if not exists organizations (
  slug text primary key,
  name text not null,
  logo_path text,
  created_at timestamptz not null default now()
);

alter table "user"
  drop constraint if exists user_organization_slug_fkey;

alter table "user"
  add constraint user_organization_slug_fkey
  foreign key (organization_slug) references organizations (slug)
  on delete set null;

create table if not exists portal_requests (
  id text primary key,
  user_id text not null references "user" (id) on delete cascade,
  type text not null check (type in ('school', 'program', 'roster', 'store')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'done')),
  admin_notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by text references "user" (id) on delete set null
);

create index if not exists portal_requests_status_created_idx
  on portal_requests (status, created_at desc);

create index if not exists portal_requests_user_id_idx on portal_requests (user_id);
