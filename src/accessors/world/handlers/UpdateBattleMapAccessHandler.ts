import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateBattleMapAccessRequest } from '../WorldRequests'
import { UpdateBattleMapAccessResponse } from '../WorldResponses'

export class UpdateBattleMapAccessHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateBattleMapAccessRequest
    const { error } = await this.db
      .from('campaigns')
      .update({
        battle_map_access_granted: req.battleMapAccessGranted,
        shared_battle_map_ids: req.sharedBattleMapIds,
        battle_map_viewport: req.battleMapViewport,
      })
      .eq('id', req.campaignId)

    if (error) {
      return new UpdateBattleMapAccessResponse(req.correlationId, false, error.message)
    }

    return new UpdateBattleMapAccessResponse(req.correlationId, true)
  }
}
