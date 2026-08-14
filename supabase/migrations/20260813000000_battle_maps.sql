-- Battle Maps feature: battle_maps table, campaign access columns, storage bucket
-- Parallel clone of the Maps feature (20260522000002_maps.sql)

-- ============================================================
-- battle_maps table
-- ============================================================
create table if not exists battle_maps (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  name         text not null,
  type         text not null check (type in ('town', 'city', 'world', 'dungeon')),
  storage_path text not null,
  image_url    text not null,
  created_at   timestamptz not null default now()
);

create index if not exists battle_maps_campaign_id_idx on battle_maps(campaign_id);

-- RLS for battle_maps
alter table battle_maps enable row level security;
create policy "battle_maps_select" on battle_maps for select using (true);
create policy "battle_maps_insert" on battle_maps for insert with check ((select auth.role()) = 'service_role');
create policy "battle_maps_update" on battle_maps for update using ((select auth.role()) = 'service_role');
create policy "battle_maps_delete" on battle_maps for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- Extend campaigns with battle map access columns
-- ============================================================
alter table campaigns add column if not exists battle_map_access_granted boolean not null default false;
alter table campaigns add column if not exists shared_battle_map_ids     text[]  not null default '{}';
alter table campaigns add column if not exists battle_map_viewport       jsonb;

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table battle_maps;

-- ============================================================
-- Storage bucket (battle-maps, public)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battle-maps',
  'battle-maps',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: anyone can read (bucket is public), only service role can write/delete
create policy "battle_maps_storage_insert" on storage.objects
  for insert with check (bucket_id = 'battle-maps' and (select auth.role()) = 'service_role');

create policy "battle_maps_storage_delete" on storage.objects
  for delete using (bucket_id = 'battle-maps' and (select auth.role()) = 'service_role');
