import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateXpRequest } from '../CharacterRequests'
import { UpdateXpResponse } from '../CharacterResponses'

export class UpdateXpHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateXpRequest
    const { error } = await this.db
      .from('characters')
      .update({ xp: req.xp })
      .eq('id', req.characterId)

    if (error) {
      return new UpdateXpResponse(req.correlationId, false, error.message)
    }

    return new UpdateXpResponse(req.correlationId, true)
  }
}
