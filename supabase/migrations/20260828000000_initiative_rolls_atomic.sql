-- Fix: concurrent initiative submissions silently lost rolls.
--
-- UpdateInitiativeRollsHandler read the whole `rolls` JSON object, added one
-- key to it in JavaScript, and wrote the whole object back. When two players
-- tap "Roll" at the same moment both read the same snapshot, and whichever
-- write lands second overwrites the other player's roll. This is the normal
-- case, not a rare one — the DM asks for initiative and the whole party taps
-- at once — so the DM would start combat with a half-filled initiative order
-- and no indication anything was dropped.
--
-- Merging the single key inside Postgres makes each submission one atomic
-- statement against the current row, so concurrent submissions can no longer
-- clobber each other.

create or replace function append_initiative_roll(
  p_campaign_id  uuid,
  p_character_id text,
  p_roll         integer
)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  updated_rows integer;
begin
  update initiative_requests
     set rolls = coalesce(rolls, '{}'::jsonb) || jsonb_build_object(p_character_id, p_roll)
   where campaign_id = p_campaign_id
     and status = 'pending';

  get diagnostics updated_rows = row_count;
  return updated_rows > 0;
end;
$$;

-- Not SECURITY DEFINER on purpose: it runs as the caller, so the existing
-- initiative_requests RLS policies still apply and only the service-role
-- client the API routes use can actually write. The explicit revoke keeps the
-- PostgREST-exposed RPC from being callable with the public anon key at all.
revoke all on function append_initiative_roll(uuid, text, integer) from public;
revoke all on function append_initiative_roll(uuid, text, integer) from anon;
revoke all on function append_initiative_roll(uuid, text, integer) from authenticated;
grant execute on function append_initiative_roll(uuid, text, integer) to service_role;
