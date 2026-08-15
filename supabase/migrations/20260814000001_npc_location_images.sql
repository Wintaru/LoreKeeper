-- Add optional portrait/illustration images to NPCs and Locations, and a
-- general-purpose storage bucket for them (distinct from the token/map
-- buckets, which have their own shape assumptions).

alter table npcs add column if not exists image_url text;
alter table npcs add column if not exists image_storage_path text;

alter table locations add column if not exists image_url text;
alter table locations add column if not exists image_storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-lore',
  'campaign-lore',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "campaign_lore_storage_insert" on storage.objects
  for insert with check (bucket_id = 'campaign-lore' and (select auth.role()) = 'service_role');

create policy "campaign_lore_storage_delete" on storage.objects
  for delete using (bucket_id = 'campaign-lore' and (select auth.role()) = 'service_role');
