import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadTokensRequest } from '../BattleMapRequests'
import { TokensResponse } from '../BattleMapResponses'
import { rowToToken } from './StoreTokenHandler'

export class LoadTokensHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadTokensRequest
    const { data, error } = await this.db
      .from('battle_tokens')
      .select('*')
      .eq('battle_map_id', req.battleMapId)
      .order('created_at', { ascending: true })

    if (error) {
      return new TokensResponse(req.correlationId, [], error.message)
    }

    return new TokensResponse(req.correlationId, (data ?? []).map(rowToToken))
  }
}
