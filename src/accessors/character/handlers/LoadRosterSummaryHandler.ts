import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadRosterSummaryRequest } from '../CharacterRequests'
import { LoadRosterSummaryResponse } from '../CharacterResponses'
import type { RosterSummary } from '@/types'

// Deliberately narrow projection — this backs player-facing surfaces (the
// in-game Roster tab and the pre-join "is this you?" picker), so it must
// never include backstory/currency/loot/pushSubscription or any other field
// LoadRosterHandler's full Character projection carries for the trusted DM view.
export class LoadRosterSummaryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadRosterSummaryRequest
    const { data, error } = await this.db
      .from('characters')
      .select('id, character_name, player_name, class, level, current_hp, max_hp')
      .eq('campaign_id', req.campaignId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      return new LoadRosterSummaryResponse(req.correlationId, [], error.message)
    }

    return new LoadRosterSummaryResponse(req.correlationId, (data ?? []).map(rowToSummary))
  }
}

function rowToSummary(row: Record<string, unknown>): RosterSummary {
  return {
    id: row.id as string,
    characterName: row.character_name as string,
    playerName: row.player_name as string,
    class: row.class as string,
    level: row.level as number,
    currentHp: row.current_hp as number,
    maxHp: row.max_hp as number,
  }
}
