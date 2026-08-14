import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateCharacterTokenRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'

export class UpdateCharacterTokenHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateCharacterTokenRequest
    const { error } = await this.db
      .from('characters')
      .update({
        token_image_url: req.tokenImageUrl,
        token_storage_path: req.tokenStoragePath,
        token_color: req.tokenColor,
      })
      .eq('id', req.characterId)

    if (error) {
      return new UpdateCharacterResponse(req.correlationId, false, error.message)
    }
    return new UpdateCharacterResponse(req.correlationId, true)
  }
}
