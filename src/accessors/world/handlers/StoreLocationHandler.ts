import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreLocationRequest } from '../WorldRequests'
import { StoreLocationResponse } from '../WorldResponses'
import type { Location } from '@/types'

export class StoreLocationHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreLocationRequest
    const { data, error } = await this.db
      .from('locations')
      .insert({
        campaign_id: req.campaignId,
        name: req.name,
        image_url: req.imageUrl,
        image_storage_path: req.imageStoragePath,
      })
      .select()
      .single()

    if (error || !data) {
      return new StoreLocationResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }
    return new StoreLocationResponse(req.correlationId, rowToLocation(data))
  }
}

export function rowToLocation(row: Record<string, unknown>): Location {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    visited: row.visited as boolean,
    notes: (row.notes as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    imageStoragePath: (row.image_storage_path as string) ?? null,
    createdAt: new Date(row.created_at as string),
  }
}
