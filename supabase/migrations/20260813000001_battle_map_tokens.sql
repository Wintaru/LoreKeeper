-- Battle Map token/fog/scale/annotation system: tokens, fog of war, map scale,
-- freehand/text/AoE annotations, custom NPC token library, and character token appearance.

-- ============================================================
-- Character token appearance (photo or colored hex + name)
-- ============================================================
alter table characters add column if not exists token_image_url    text;
alter table characters add column if not exists token_storage_path text;
alter table characters add column if not exists token_color        text not null default '#b45309';

-- ============================================================
-- battle_tokens — any token placed on a battle map (player, npc/enemy)
-- ============================================================
create table if not exists battle_tokens (
  id                  uuid primary key default gen_random_uuid(),
  campaign_id         uuid not null references campaigns(id) on delete cascade,
  battle_map_id       uuid not null references battle_maps(id) on delete cascade,
  kind                text not null check (kind in ('player', 'npc')),
  character_id        uuid references characters(id) on delete set null,
  name                text not null,
  base_name           text not null,
  library_key         text,
  image_url           text,
  storage_path        text,
  color               text not null default '#78716c',
  x                   numeric not null default 0.5,
  y                   numeric not null default 0.5,
  size                numeric not null default 1,
  visible_to_players  boolean not null default true,
  show_range          boolean not null default false,
  status_effects      jsonb not null default '[]',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists battle_tokens_map_idx on battle_tokens(battle_map_id);

alter table battle_tokens enable row level security;
create policy "battle_tokens_select" on battle_tokens for select using (true);
create policy "battle_tokens_insert" on battle_tokens for insert with check ((select auth.role()) = 'service_role');
create policy "battle_tokens_update" on battle_tokens for update using ((select auth.role()) = 'service_role');
create policy "battle_tokens_delete" on battle_tokens for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- battle_map_fog — fog-of-war strokes for a battle map (one row per map)
-- ============================================================
create table if not exists battle_map_fog (
  battle_map_id uuid primary key references battle_maps(id) on delete cascade,
  strokes       jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);

alter table battle_map_fog enable row level security;
create policy "battle_map_fog_select" on battle_map_fog for select using (true);
create policy "battle_map_fog_insert" on battle_map_fog for insert with check ((select auth.role()) = 'service_role');
create policy "battle_map_fog_update" on battle_map_fog for update using ((select auth.role()) = 'service_role');
create policy "battle_map_fog_delete" on battle_map_fog for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- battle_map_scale — real-world scale calibration for a battle map
-- feet_per_unit = feet represented by the full normalized (0-1) map width
-- ============================================================
create table if not exists battle_map_scale (
  battle_map_id  uuid primary key references battle_maps(id) on delete cascade,
  feet_per_unit  numeric not null default 60,
  updated_at     timestamptz not null default now()
);

alter table battle_map_scale enable row level security;
create policy "battle_map_scale_select" on battle_map_scale for select using (true);
create policy "battle_map_scale_insert" on battle_map_scale for insert with check ((select auth.role()) = 'service_role');
create policy "battle_map_scale_update" on battle_map_scale for update using ((select auth.role()) = 'service_role');
create policy "battle_map_scale_delete" on battle_map_scale for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- battle_map_annotations — pencil strokes, text notes, AoE templates
-- ============================================================
create table if not exists battle_map_annotations (
  id             uuid primary key default gen_random_uuid(),
  battle_map_id  uuid not null references battle_maps(id) on delete cascade,
  kind           text not null check (kind in ('pencil', 'text', 'aoe')),
  data           jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists battle_map_annotations_map_idx on battle_map_annotations(battle_map_id);

alter table battle_map_annotations enable row level security;
create policy "battle_map_annotations_select" on battle_map_annotations for select using (true);
create policy "battle_map_annotations_insert" on battle_map_annotations for insert with check ((select auth.role()) = 'service_role');
create policy "battle_map_annotations_update" on battle_map_annotations for update using ((select auth.role()) = 'service_role');
create policy "battle_map_annotations_delete" on battle_map_annotations for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- battle_token_library — DM's custom NPC/enemy token images (built-ins ship in code)
-- ============================================================
create table if not exists battle_token_library (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  name          text not null,
  base_name     text not null,
  image_url     text not null,
  storage_path  text not null,
  color         text not null default '#78716c',
  created_at    timestamptz not null default now()
);

create index if not exists battle_token_library_campaign_idx on battle_token_library(campaign_id);

alter table battle_token_library enable row level security;
create policy "battle_token_library_select" on battle_token_library for select using (true);
create policy "battle_token_library_insert" on battle_token_library for insert with check ((select auth.role()) = 'service_role');
create policy "battle_token_library_update" on battle_token_library for update using ((select auth.role()) = 'service_role');
create policy "battle_token_library_delete" on battle_token_library for delete using ((select auth.role()) = 'service_role');

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table battle_tokens;
alter publication supabase_realtime add table battle_map_fog;
alter publication supabase_realtime add table battle_map_annotations;

-- ============================================================
-- Storage bucket (battle-tokens, public) — character photos + custom library art
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'battle-tokens',
  'battle-tokens',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "battle_tokens_storage_insert" on storage.objects
  for insert with check (bucket_id = 'battle-tokens' and (select auth.role()) = 'service_role');

create policy "battle_tokens_storage_delete" on storage.objects
  for delete using (bucket_id = 'battle-tokens' and (select auth.role()) = 'service_role');
