# Portal database migrations

## Safe production deploy order

Apply SQL migrations on Neon **before or in the same release** as the app build that depends on them.

| Step | Action |
|------|--------|
| 1 | `npm run db:migrate` on production `DATABASE_URL` (applies `001`, `002`, then `003`) |
| 2 | Deploy the portal app |
| 3 | Set `RESEND_API_KEY` + `INVITE_FROM_EMAIL` on the host (optional; without them, admins copy invite links) |
| 4 | In **Users**, assign programs to each director/manager; use **Requests** for onboarding queue |

### If the app deploys before migrations

| Migration | Symptom if missing | Sign-in |
|-----------|-------------------|---------|
| **002** (`banned`, `banReason`, `banExpires`, `impersonatedBy`) | Credential sign-in **500** (admin plugin expects columns) | **Broken** until 002 runs |
| **001** (`user_program_assignments`, `programs.school_slug`, role check) | Directors/managers see **legacy unscoped** data (`preMigrationMode`) | Works |
| **003** (invite columns, `portal_requests`, `organizations`) | No invite status, no checklist persistence, no **Requests** nav; onboarding APIs return friendly errors | Works |
| Neither 001 nor 002 | Same as missing 002 if admin plugin is in the build | **Broken** without 002 |

**001 alone is not enough** for auth releases that include the admin plugin: run **002** at minimum before traffic hits new auth code.

Sign-up remains disabled in app config regardless of DB state.

## Files

- `db/migrations/001_roles_and_assignments.sql` — roles, assignments, scoping columns
- `db/migrations/002_better_auth_admin_columns.sql` — Better Auth admin plugin columns
- `db/migrations/003_invites_onboarding_requests.sql` — invite tracking, onboarding dismiss, organizations, portal_requests queue

## Commands

```bash
cd portal
export DATABASE_URL='…'   # never commit
npm run db:migrate        # production: once per release with new SQL
npm run db:seed           # local/demo only — truncates program data, applies schema.sql
npm run db:seed-users     # local Postgres only; requires SEED_* env (see .env.example)
```

### What Steven should run on production Neon

From the portal directory, with production `DATABASE_URL` set (never commit):

```bash
cd portal
export DATABASE_URL='postgresql://…'   # prod Neon connection string
npm run db:migrate
```

That applies any pending files in `db/migrations/` in order, including **003** when this release ships. Re-running `db:migrate` is safe (statements are idempotent).

Local `db:seed-users` creates **`admin@test.local`** (not `admin@voltasport.co`). Set **`SEED_ADMIN_PASSWORD`**, **`SEED_DIRECTOR_PASSWORD`**, and **`SEED_MANAGER_PASSWORD`** in `portal/.env.local` (gitignored). Scripts fail with a clear error if any are missing.

### Fresh local validation DB

```bash
npm run db:seed && npm run db:migrate && npm run db:seed-users
npm run build && npm run start -- -p 3001
# export SEED_* from .env.local, then run phase 2 validation screenshots
```
