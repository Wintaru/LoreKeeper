import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadRosterSummaryRequest } from '../CharacterRequests'
import { LoadRosterSummaryResponse } from '../CharacterResponses'
import type { RosterSummary, ClassLevel } from '@/types'
import { resolveClasses } from '@/data/multiclass'

// Deliberately narrow projection — this backs player-facing surfaces (the
// in-game Roster tab and the pre-join "is this you?" picker), so it must
// never include backstory/pushSubscription or any other field
// LoadRosterHandler's full Character projection carries for the trusted DM view.
//
// Wallet/loot ARE included, but only when the character has opted in via
// share_inventory_with_party — the character's own privacy choice, not a
// blanket exposure. See rowToSummary below.
export class LoadRosterSummaryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadRosterSummaryRequest
    const { data, error } = await this.db
      .from('characters')
      .select('id, character_name, player_name, class, classes, level, current_hp, max_hp, share_inventory_with_party, gold, silver, copper, custom_currency, loot')
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
  const characterClass = row.class as string
  const level = row.level as number
  const shared = (row.share_inventory_with_party as boolean) ?? false
  return {
    id: row.id as string,
    characterName: row.character_name as string,
    playerName: row.player_name as string,
    class: characterClass,
    classes: resolveClasses(row.classes as ClassLevel[] | null, characterClass, level),
    level,
    currentHp: row.current_hp as number,
    maxHp: row.max_hp as number,
    shareInventoryWithParty: shared,
    ...(shared ? {
      gold: (row.gold as number) ?? 0,
      silver: (row.silver as number) ?? 0,
      copper: (row.copper as number) ?? 0,
      customCurrency: (row.custom_currency as RosterSummary['customCurrency']) ?? [],
      loot: (row.loot as RosterSummary['loot']) ?? [],
    } : {}),
  }
}
