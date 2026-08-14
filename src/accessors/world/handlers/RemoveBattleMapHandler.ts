import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RemoveBattleMapRequest } from '../WorldRequests'
import { RemoveBattleMapResponse } from '../WorldResponses'

export class RemoveBattleMapHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as RemoveBattleMapRequest

    // Remove storage file first; don't block on storage error
    await this.db.storage.from('battle-maps').remove([req.storagePath])

    const { error } = await this.db
      .from('battle_maps')
      .delete()
      .eq('id', req.mapId)

    if (error) {
      return new RemoveBattleMapResponse(req.correlationId, false, error.message)
    }

    return new RemoveBattleMapResponse(req.correlationId, true)
  }
}
