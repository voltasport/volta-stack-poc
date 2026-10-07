# Portal database migrations

## Safe production deploy order

Apply SQL migrations on Neon **before or in the same release** as the app build that depends on them.

| Step | Action |
|------|--------|
| 1 | `npm run db:migrate` on production `DATABASE_URL` (applies `001`, `002`; apply **`003` only when Steven approves** for invite columns) |
| 2 | Deploy the portal app |
| 3 | Set `RESEND_API_KEY` + `INVITE_FROM_EMAIL` on the host (optional; without them, admins copy invite links) |
| 4 | In **Users**, assign programs to each director/manager or have them create programs in-app |

### If the app deploys before migrations

| Migration | Symptom if missing | Sign-in |
|-----------|-------------------|---------|
| **002** (`banned`, `banReason`, `banExpires`, `impersonatedBy`) | Credential sign-in **500** (admin plugin expects columns) | **Broken** until 002 runs |
| **001** (`user_program_assignments`, `programs.school_slug`, role check) | Directors/managers see **legacy unscoped** data (`preMigrationMode`) | Works |
| **003** (invite + onboarding dismiss columns only) | No invite status badges; dismiss checklist column missing (checklist still works) | Works |
| Neither 001 nor 002 | Same as missing 002 if admin plugin is in the build | **Broken** without 002 |

**001 alone is not enough** for auth releases that include the admin plugin: run **002** at minimum before traffic hits new auth code.

Sign-up remains disabled in app config regardless of DB state.

## Files

- `db/migrations/001_roles_and_assignments.sql` — roles, assignments, scoping columns
- `db/migrations/002_better_auth_admin_columns.sql` — Better Auth admin plugin columns
- `db/migrations/003_invites_onboarding_requests.sql` — invite tracking + onboarding dismiss (no requests/uploads tables)

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
npm run db:migrate   # through 002 always; add 003 when ready for invite columns
```

Re-running `db:migrate` is safe (statements are idempotent).

Local `db:seed-users` creates **`admin@test.local`**. Set **`SEED_ADMIN_PASSWORD`**, **`SEED_DIRECTOR_PASSWORD`**, and **`SEED_MANAGER_PASSWORD`** in `portal/.env.local` (gitignored).

### Fresh local validation DB

```bash
npm run db:seed && npm run db:migrate && npm run db:seed-users
npm run build && npm run start -- -p 3001
node scripts/phase2-validate-screens.mjs
```
