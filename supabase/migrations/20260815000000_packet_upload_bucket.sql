-- Temporary staging bucket for campaign packet uploads (.zip/.docx/.txt/.md).
-- The browser uploads directly here via a signed upload URL so large packets
-- never pass through a Next.js API route body (Vercel caps those at 4.5MB).
-- The import route downloads the object server-side and deletes it when done.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campaign-packet-uploads',
  'campaign-packet-uploads',
  false,
  52428800,  -- 50 MB
  array[
    'application/zip', 'application/x-zip-compressed', 'application/octet-stream',
    'text/plain', 'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create policy "campaign_packet_uploads_storage_insert" on storage.objects
  for insert with check (bucket_id = 'campaign-packet-uploads' and (select auth.role()) = 'service_role');

create policy "campaign_packet_uploads_storage_select" on storage.objects
  for select using (bucket_id = 'campaign-packet-uploads' and (select auth.role()) = 'service_role');

create policy "campaign_packet_uploads_storage_delete" on storage.objects
  for delete using (bucket_id = 'campaign-packet-uploads' and (select auth.role()) = 'service_role');
