import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadLibraryRequest } from '../BattleMapRequests'
import { LibraryResponse } from '../BattleMapResponses'
import { rowToLibraryEntry } from './StoreLibraryEntryHandler'

export class LoadLibraryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadLibraryRequest
    const { data, error } = await this.db
      .from('battle_token_library')
      .select('*')
      .eq('campaign_id', req.campaignId)
      .order('created_at', { ascending: true })

    if (error) {
      return new LibraryResponse(req.correlationId, [], error.message)
    }
    return new LibraryResponse(req.correlationId, (data ?? []).map(rowToLibraryEntry))
  }
}
