-- Portal roles, program scoping, and user assignments.
-- Apply to production manually (see PR). Do not run from CI against Neon prod.

alter table programs
  add column if not exists school_slug text not null default 'slcc';

alter table "user" drop constraint if exists user_role_check;
alter table "user"
  add constraint user_role_check check (role in ('admin', 'director', 'manager'));

create table if not exists user_program_assignments (
  user_id text not null references "user" (id) on delete cascade,
  program_slug text not null references programs (slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, program_slug)
);

create index if not exists user_program_assignments_user_idx
  on user_program_assignments (user_id);

alter table tasks
  add column if not exists program_slug text references programs (slug) on delete set null;

-- Preserve production admin; demote any other admin accounts to director.
update "user"
set role = 'admin'
where lower(email) = 'admin@voltasport.co';

update "user"
set role = 'director'
where role = 'admin'
  and lower(email) <> 'admin@voltasport.co';

update "user"
set role = 'director'
where role not in ('admin', 'director', 'manager');
