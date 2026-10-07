# Portal database migrations

## Safe production deploy order

Apply **both** SQL migrations on Neon **before or in the same release** as the app build that enables Better Auth `admin` and role scoping.

| Step | Action |
|------|--------|
| 1 | `npm run db:migrate` on production `DATABASE_URL` (applies `001` then `002`) |
| 2 | Deploy the portal app |
| 3 | In **Users**, assign programs to each director/manager |

### If the app deploys before migrations

| Migration | Symptom if missing | Sign-in |
|-----------|-------------------|---------|
| **002** (`banned`, `banReason`, `banExpires`, `impersonatedBy`) | Credential sign-in **500** (admin plugin expects columns) | **Broken** until 002 runs |
| **001** (`user_program_assignments`, `programs.school_slug`, role check) | Directors/managers see **legacy unscoped** data (`preMigrationMode`) | Works |
| Neither | Same as missing 002 if admin plugin is in the build | **Broken** without 002 |

**001 alone is not enough** for this release: run **002** at minimum before traffic hits the new auth code.

Sign-up remains disabled in app config regardless of DB state.

## Files

- `db/migrations/001_roles_and_assignments.sql` — roles, assignments, scoping columns
- `db/migrations/002_better_auth_admin_columns.sql` — Better Auth admin plugin columns

## Commands

```bash
cd portal
export DATABASE_URL='…'   # never commit
npm run db:migrate        # production: once per release with new SQL
npm run db:seed           # local/demo only — truncates program data, applies schema.sql
npm run db:seed-users     # local/dev only — test users; set SEED_* passwords via env
```

### Fresh local validation DB

```bash
npm run db:seed && npm run db:migrate && npm run db:seed-users
npm run build && npm run start -- -p 3001
node scripts/validate-roles-prod.mjs
```
