import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreBattleMapRequest } from '../WorldRequests'
import { StoreBattleMapResponse } from '../WorldResponses'
import type { BattleMap } from '@/types'

export class StoreBattleMapHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreBattleMapRequest
    const { data, error } = await this.db
      .from('battle_maps')
      .insert({
        campaign_id: req.campaignId,
        name: req.name,
        type: req.type,
        storage_path: req.storagePath,
        image_url: req.imageUrl,
      })
      .select()
      .single()

    if (error || !data) {
      return new StoreBattleMapResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }

    return new StoreBattleMapResponse(req.correlationId, rowToBattleMap(data))
  }
}

export function rowToBattleMap(row: Record<string, unknown>): BattleMap {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    type: row.type as BattleMap['type'],
    storagePath: row.storage_path as string,
    imageUrl: row.image_url as string,
    createdAt: new Date(row.created_at as string),
  }
}
