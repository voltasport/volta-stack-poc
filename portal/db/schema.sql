-- Slim portal schema. Programs, proofs, and rosters live here.
-- Shopify stays the catalog and checkout. This database does not store products.

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
