import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateCharacterClassesRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'

// Pure persistence — every value on the request has already been derived by
// CharacterManager via SpellcastingEngine. No rules logic belongs here.
export class UpdateCharacterClassesHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateCharacterClassesRequest
    const { error } = await this.db
      .from('characters')
      .update({
        classes: req.classes,
        class: req.primaryClass,
        level: req.totalLevel,
        max_hp: req.maxHp,
        current_hp: req.currentHp,
        spell_slots: req.spellSlots,
        ...(req.xp !== undefined ? { xp: req.xp } : {}),
      })
      .eq('id', req.characterId)

    if (error) {
      return new UpdateCharacterResponse(req.correlationId, false, error.message)
    }
    return new UpdateCharacterResponse(req.correlationId, true)
  }
}
