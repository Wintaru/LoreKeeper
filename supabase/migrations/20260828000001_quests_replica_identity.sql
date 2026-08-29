-- Fix: same class of bug already fixed for battle_tokens/battle_map_annotations
-- (20260814000000) and characters (20260826000000).
--
-- The player campaign page subscribes to `quests` with event '*' filtered by
-- campaign_id=eq.<id>. Under the default replica identity a DELETE event only
-- carries the primary key (id), not campaign_id — so Realtime cannot evaluate
-- the filter and never delivers the event to that subscriber.
--
-- Symptom this fixes: the DM deletes a quest and it stays on every player's
-- Quests tab, still tappable, until they reload the page.
--
-- quests is the last table in the supabase_realtime publication with a
-- filtered '*' (delete-carrying) subscription; the others are subscribed to
-- INSERT/UPDATE only, or filtered on their own primary key, and so are
-- unaffected.

alter table quests replica identity full;
