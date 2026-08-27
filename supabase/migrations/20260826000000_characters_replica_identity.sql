-- Fix: same class of bug already fixed for battle_tokens/battle_map_annotations
-- in 20260814000000_battlemap_replica_identity.sql. The player Roster tab
-- subscribes to characters filtered by campaign_id=eq.<id>, but under the
-- default replica identity a DELETE event only carries the primary key (id),
-- not campaign_id — so Realtime can't evaluate the filter and never delivers
-- the event to that subscriber. REPLICA IDENTITY FULL includes all columns
-- on the old row, letting the filter match correctly.
--
-- Symptom this fixes: a character is removed (kicked/deleted) and keeps
-- showing, with stale HP, in other players' Roster tab until they reload.

alter table characters replica identity full;
