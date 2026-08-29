import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateInitiativeRollsRequest } from '../CombatRequests'
import { UpdateInitiativeRollsResponse } from '../CombatResponses'

export class UpdateInitiativeRollsHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateInitiativeRollsRequest

    // One atomic jsonb merge in the database rather than read-modify-write in
    // JS: the whole party taps "Roll" at the same moment, and a read-then-write
    // round trip loses every roll but the last one to land.
    const { data, error } = await this.db.rpc('append_initiative_roll', {
      p_campaign_id: req.campaignId,
      p_character_id: req.characterId,
      p_roll: req.roll,
    })

    if (error) return new UpdateInitiativeRollsResponse(req.correlationId, error.message)

    if (data !== true) {
      return new UpdateInitiativeRollsResponse(req.correlationId, 'No pending initiative request')
    }

    return new UpdateInitiativeRollsResponse(req.correlationId)
  }
}
