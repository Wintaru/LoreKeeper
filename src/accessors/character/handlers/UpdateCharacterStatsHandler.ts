import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateCharacterStatsRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'

export class UpdateCharacterStatsHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateCharacterStatsRequest
    const { error } = await this.db
      .from('characters')
      .update({
        max_hp: req.maxHp,
        current_hp: req.currentHp,
        armor_class: req.armorClass,
        speed: req.speed,
        passive_perception: req.passivePerception,
      })
      .eq('id', req.characterId)

    if (error) {
      return new UpdateCharacterResponse(req.correlationId, false, error.message)
    }
    return new UpdateCharacterResponse(req.correlationId, true)
  }
}
