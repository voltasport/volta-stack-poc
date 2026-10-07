-- Invite tracking and onboarding checklist dismiss (local/staging first — do not run on prod Neon until Steven approves).

alter table "user" add column if not exists invited_at timestamptz;
alter table "user" add column if not exists last_invite_sent_at timestamptz;
alter table "user" add column if not exists first_login_at timestamptz;
alter table "user" add column if not exists onboarding_dismissed_at timestamptz;

-- Retired from an earlier draft of this PR (safe to drop if present).
alter table "user" drop column if exists organization_slug;
drop table if exists portal_requests cascade;
drop table if exists organizations cascade;
drop table if exists portal_uploads cascade;
