import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadRosterRequest } from '../CharacterRequests'
import { LoadRosterResponse } from '../CharacterResponses'
import { rowToCharacter } from '@/lib/characterRow'

export class LoadRosterHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadRosterRequest
    const { data, error } = await this.db
      .from('characters')
      .select()
      .eq('campaign_id', req.campaignId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      return new LoadRosterResponse(req.correlationId, [], error.message)
    }

    return new LoadRosterResponse(req.correlationId, (data ?? []).map(rowToCharacter))
  }
}
