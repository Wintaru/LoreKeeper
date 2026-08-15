import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreNpcRequest } from '../WorldRequests'
import { StoreNpcResponse } from '../WorldResponses'
import type { Npc, NpcRelationship } from '@/types'

export class StoreNpcHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreNpcRequest
    const { data, error } = await this.db
      .from('npcs')
      .insert({
        campaign_id: req.campaignId,
        name: req.name,
        faction: req.faction,
        last_location: req.lastLocation,
        notes: req.notes,
        relationships: req.relationships,
        image_url: req.imageUrl,
        image_storage_path: req.imageStoragePath,
      })
      .select()
      .single()

    if (error || !data) {
      return new StoreNpcResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }
    return new StoreNpcResponse(req.correlationId, rowToNpc(data))
  }
}

export function rowToNpc(row: Record<string, unknown>): Npc {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    faction: (row.faction as string) ?? null,
    lastLocation: (row.last_location as string) ?? null,
    notes: (row.notes as string) ?? null,
    relationships: (row.relationships as NpcRelationship[]) ?? [],
    imageUrl: (row.image_url as string) ?? null,
    imageStoragePath: (row.image_storage_path as string) ?? null,
    createdAt: new Date(row.created_at as string),
  }
}
