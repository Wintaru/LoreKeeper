-- Fix: Realtime DELETE events on battle_tokens and battle_map_annotations were
-- silently dropped for filtered subscribers (e.g. the player view watching
-- battle_map_id=eq.<id>). Under the default replica identity, a DELETE event
-- only carries the primary key column, not battle_map_id, so Postgres/Realtime
-- can't evaluate the filter and never delivers the event. REPLICA IDENTITY FULL
-- includes all columns on the old row, letting the filter match correctly.
--
-- Symptom this fixes: DM deletes/undoes a token or an annotation (e.g. an
-- undone pencil stroke) and it never disappears from the player's screen
-- until they reload the page.

alter table battle_tokens replica identity full;
alter table battle_map_annotations replica identity full;
