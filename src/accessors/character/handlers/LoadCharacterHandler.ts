import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadCharacterRequest } from '../CharacterRequests'
import { LoadCharacterResponse } from '../CharacterResponses'
import { rowToCharacter } from '@/lib/characterRow'

export class LoadCharacterHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadCharacterRequest
    const { data, error } = await this.db
      .from('characters')
      .select()
      .eq('id', req.characterId)
      .single()

    if (error || !data) {
      return new LoadCharacterResponse(req.correlationId, null, error?.message ?? 'Character not found')
    }

    return new LoadCharacterResponse(req.correlationId, rowToCharacter(data))
  }
}

// Re-exported for the handlers that already import it from here.
export { rowToCharacter }
