import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadBattleMapsRequest } from '../WorldRequests'
import { LoadBattleMapsResponse } from '../WorldResponses'
import { rowToBattleMap } from './StoreBattleMapHandler'

export class LoadBattleMapsHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadBattleMapsRequest
    const { data, error } = await this.db
      .from('battle_maps')
      .select('*')
      .eq('campaign_id', req.campaignId)
      .order('created_at', { ascending: true })

    if (error) {
      return new LoadBattleMapsResponse(req.correlationId, [], error.message)
    }

    return new LoadBattleMapsResponse(req.correlationId, (data ?? []).map(rowToBattleMap))
  }
}
