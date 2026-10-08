-- Per-program sized kit items and roster size values (additive, idempotent).

create table if not exists program_sized_items (
  id bigint generated always as identity primary key,
  program_slug text not null references programs (slug) on delete cascade,
  name text not null,
  size_options text[] not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint program_sized_items_program_name unique (program_slug, name)
);

create index if not exists program_sized_items_program_idx
  on program_sized_items (program_slug, sort_order);

create table if not exists roster_row_sizes (
  roster_row_id bigint not null references roster_rows (id) on delete cascade,
  sized_item_id bigint not null references program_sized_items (id) on delete cascade,
  size_value text not null,
  primary key (roster_row_id, sized_item_id)
);

-- Default Jersey + Short for every program that has no sized items yet.
insert into program_sized_items (program_slug, name, size_options, sort_order)
select p.slug, v.name, v.size_options, v.sort_order
from programs p
cross join (
  values
    ('Jersey'::text, array['YS','YM','YL','S','M','L','XL','2XL']::text[], 0),
    ('Short'::text, array['YS','YM','YL','S','M','L','XL','2XL']::text[], 1)
) as v(name, size_options, sort_order)
where not exists (
  select 1 from program_sized_items i where i.program_slug = p.slug
);

-- Backfill roster_row_sizes from legacy jersey / short columns.
insert into roster_row_sizes (roster_row_id, sized_item_id, size_value)
select r.id, i.id, r.jersey
from roster_rows r
join program_sized_items i on i.program_slug = r.program_slug and i.name = 'Jersey'
where r.jersey is not null and trim(r.jersey) <> '' and r.jersey <> '—'
on conflict (roster_row_id, sized_item_id) do nothing;

insert into roster_row_sizes (roster_row_id, sized_item_id, size_value)
select r.id, i.id, r.short
from roster_rows r
join program_sized_items i on i.program_slug = r.program_slug and i.name = 'Short'
where r.short is not null and trim(r.short) <> '' and r.short <> '—'
on conflict (roster_row_id, sized_item_id) do nothing;
