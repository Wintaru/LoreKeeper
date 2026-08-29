-- Multiclassing: per-class level tracking for characters.
--
-- `classes` is a JSONB array of { name, level, subclass } — the same storage
-- pattern already used on this table for spell_slots / conditions / loot /
-- custom_currency, so no new table (and therefore no new RLS policy set) is
-- needed. The existing characters RLS policies cover this column.
--
-- The scalar `class` and `level` columns are deliberately KEPT as derived
-- values: `class` is the primary (first) class and `level` is the TOTAL
-- character level. See the comment on the Character interface in
-- src/types/index.ts for the reasoning.

alter table characters
  add column if not exists classes jsonb not null default '[]'::jsonb;

-- Backfill every existing character as a single-class entry built from the
-- scalar columns, so no row is left with an empty class list.
update characters
set classes = jsonb_build_array(
  jsonb_build_object(
    'name',     class,
    'level',    level,
    'subclass', null
  )
)
where classes = '[]'::jsonb;

comment on column characters.classes is
  'Array of { name, level, subclass } per class. characters.level is the sum of these levels; characters.class is the first entry (primary class).';
