import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreLibraryEntryRequest } from '../BattleMapRequests'
import { LibraryEntryResponse } from '../BattleMapResponses'
import type { BattleTokenLibraryEntry } from '@/types'

export class StoreLibraryEntryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreLibraryEntryRequest
    const { data, error } = await this.db
      .from('battle_token_library')
      .insert({
        campaign_id: req.campaignId,
        name: req.name,
        base_name: req.baseName,
        image_url: req.imageUrl,
        storage_path: req.storagePath,
        color: req.color,
      })
      .select()
      .single()

    if (error || !data) {
      return new LibraryEntryResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }
    return new LibraryEntryResponse(req.correlationId, rowToLibraryEntry(data))
  }
}

export function rowToLibraryEntry(row: Record<string, unknown>): BattleTokenLibraryEntry {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    name: row.name as string,
    baseName: row.base_name as string,
    imageUrl: row.image_url as string,
    storagePath: row.storage_path as string,
    color: row.color as string,
    createdAt: new Date(row.created_at as string),
  }
}
