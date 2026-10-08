-- Kit items carry their own size options; roster rows store one size per sized kit item.
-- Additive and safe to re-run: nothing is dropped or deleted, and the one-time defaults/backfill
-- are guarded by a marker row so re-running db:migrate never re-adds items a director removed.

alter table kit_items add column if not exists size_options text[] not null default '{}';

create table if not exists roster_row_sizes (
  roster_row_id bigint not null references roster_rows (id) on delete cascade,
  kit_item_id bigint not null references kit_items (id) on delete cascade,
  size_value text not null,
  primary key (roster_row_id, kit_item_id)
);

create index if not exists roster_row_sizes_kit_item_idx on roster_row_sizes (kit_item_id);

create table if not exists portal_migration_markers (
  name text primary key,
  applied_at timestamptz not null default now()
);

-- One-time: give every program without a sized kit item a sized Jersey and Short
-- so existing jersey/short roster values have a home.
insert into kit_items (program_slug, name, qty, proof, status, sort_order, size_options)
select p.slug, v.name, '—', '', 'Planned',
       coalesce((select max(k.sort_order) from kit_items k where k.program_slug = p.slug), -1) + v.offset_order,
       array['YS','YM','YL','S','M','L','XL','2XL']::text[]
from programs p
cross join (values ('Jersey'::text, 1), ('Short'::text, 2)) as v(name, offset_order)
where not exists (select 1 from portal_migration_markers m where m.name = '004_defaults')
  and not exists (
    select 1 from kit_items k where k.program_slug = p.slug and cardinality(k.size_options) > 0
  );

-- One-time: copy legacy roster jersey / short values into roster_row_sizes.
insert into roster_row_sizes (roster_row_id, kit_item_id, size_value)
select r.id, k.id, trim(r.jersey)
from roster_rows r
join kit_items k
  on k.program_slug = r.program_slug and k.name = 'Jersey' and cardinality(k.size_options) > 0
where not exists (select 1 from portal_migration_markers m where m.name = '004_defaults')
  and trim(r.jersey) <> '' and r.jersey <> '—'
on conflict (roster_row_id, kit_item_id) do nothing;

insert into roster_row_sizes (roster_row_id, kit_item_id, size_value)
select r.id, k.id, trim(r.short)
from roster_rows r
join kit_items k
  on k.program_slug = r.program_slug and k.name = 'Short' and cardinality(k.size_options) > 0
where not exists (select 1 from portal_migration_markers m where m.name = '004_defaults')
  and trim(r.short) <> '' and r.short <> '—'
on conflict (roster_row_id, kit_item_id) do nothing;

insert into portal_migration_markers (name) values ('004_defaults') on conflict (name) do nothing;
