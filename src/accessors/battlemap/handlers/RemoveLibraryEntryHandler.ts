import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RemoveLibraryEntryRequest } from '../BattleMapRequests'
import { AckResponse } from '../BattleMapResponses'

export class RemoveLibraryEntryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as RemoveLibraryEntryRequest

    await this.db.storage.from('battle-tokens').remove([req.storagePath])

    const { error } = await this.db
      .from('battle_token_library')
      .delete()
      .eq('id', req.entryId)

    if (error) {
      return new AckResponse(req.correlationId, false, error.message)
    }
    return new AckResponse(req.correlationId, true)
  }
}
