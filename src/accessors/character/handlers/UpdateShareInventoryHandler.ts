import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateShareInventoryRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'

export class UpdateShareInventoryHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateShareInventoryRequest
    const { error } = await this.db
      .from('characters')
      .update({ share_inventory_with_party: req.shareInventoryWithParty })
      .eq('id', req.characterId)

    if (error) {
      return new UpdateCharacterResponse(req.correlationId, false, error.message)
    }
    return new UpdateCharacterResponse(req.correlationId, true)
  }
}
