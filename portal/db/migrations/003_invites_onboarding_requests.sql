-- Invite tracking and onboarding checklist dismiss (local/staging first — do not run on prod Neon until Steven approves).

alter table "user" add column if not exists invited_at timestamptz;
alter table "user" add column if not exists last_invite_sent_at timestamptz;
alter table "user" add column if not exists first_login_at timestamptz;
alter table "user" add column if not exists onboarding_dismissed_at timestamptz;

-- Retired from an earlier draft of this PR (safe to drop if present).
drop table if exists portal_requests cascade;
drop table if exists organizations cascade;
drop table if exists portal_uploads cascade;

create table if not exists portal_organizations (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

alter table "user" add column if not exists organization_slug text;

alter table "user" drop constraint if exists user_organization_slug_fkey;
alter table "user"
  add constraint user_organization_slug_fkey
  foreign key (organization_slug) references portal_organizations (slug)
  on delete set null;
