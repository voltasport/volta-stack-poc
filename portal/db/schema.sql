-- Slim portal schema. Programs, proofs, and rosters live here.
-- Shopify stays the catalog and checkout. This database does not store products.
-- Auth tables match Better Auth's default Postgres names. The portal does not
-- require a session; these tables are here so sign-in can be added later.

create table if not exists programs (
  slug text primary key,
  name text not null,
  line text not null,
  meta text not null,
  stage text not null,
  status text not null,
  filled integer not null,
  total integer not null,
  eyebrow text not null,
  title text not null,
  delivery_label text not null,
  delivery_date text not null,
  phase text not null,
  week_note text not null,
  week_author text not null,
  ship_to text not null,
  ship_note text not null,
  sort_order integer not null
);

create table if not exists kit_items (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  name text not null,
  qty text not null,
  proof text not null,
  status text not null,
  sort_order integer not null
);

create table if not exists roster_rows (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  num text not null,
  name text not null,
  pos text not null,
  jersey text not null,
  short text not null,
  back text not null,
  submitted boolean not null,
  sort_order integer not null
);

create table if not exists milestones (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  label text not null,
  date text not null,
  state text not null,
  sort_order integer not null
);

create table if not exists proofs (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  version text not null,
  date text not null,
  note text not null,
  current boolean not null default false,
  sort_order integer not null
);

create table if not exists files (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  name text not null,
  meta text not null,
  sort_order integer not null
);

create table if not exists tasks (
  id bigint generated always as identity primary key,
  href text not null,
  title text not null,
  detail text not null,
  badge text not null,
  sort_order integer not null
);

create table if not exists updates (
  id bigint generated always as identity primary key,
  tone text not null,
  text text not null,
  when_label text not null,
  sort_order integer not null
);

create table if not exists "user" (
  id text primary key,
  name text not null,
  email text not null,
  "emailVerified" boolean not null default false,
  image text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  role text not null default 'director'
);

create unique index if not exists user_email_uidx on "user" (email);

create table if not exists "session" (
  id text primary key,
  "expiresAt" timestamptz not null,
  token text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" (id) on delete cascade
);

create unique index if not exists session_token_uidx on "session" (token);
create index if not exists "session_userId_idx" on "session" ("userId");

create table if not exists "account" (
  id text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" (id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "account_userId_idx" on "account" ("userId");

create table if not exists "verification" (
  id text primary key,
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists verification_identifier_idx on "verification" (identifier);

create table if not exists "rateLimit" (
  id text primary key,
  key text not null,
  count integer not null,
  "lastRequest" bigint not null
);

create unique index if not exists "rateLimit_key_uidx" on "rateLimit" (key);
