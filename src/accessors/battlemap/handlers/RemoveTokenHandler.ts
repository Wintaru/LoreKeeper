import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RemoveTokenRequest } from '../BattleMapRequests'
import { AckResponse } from '../BattleMapResponses'

export class RemoveTokenHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as RemoveTokenRequest
    const { error } = await this.db
      .from('battle_tokens')
      .delete()
      .eq('id', req.tokenId)

    if (error) {
      return new AckResponse(req.correlationId, false, error.message)
    }
    return new AckResponse(req.correlationId, true)
  }
}
