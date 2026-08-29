import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreCharacterRequest } from '../CharacterRequests'
import { StoreCharacterResponse } from '../CharacterResponses'
import { rowToCharacter } from '@/lib/characterRow'

export class StoreCharacterHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreCharacterRequest
    const { data, error } = await this.db
      .from('characters')
      .insert({
        campaign_id: req.campaignId,
        player_name: req.playerName,
        character_name: req.characterName,
        class: req.characterClass,
        // A joining character always starts single-classed; `classes` is seeded
        // to match so no row is ever written with an empty class list.
        classes: [{ name: req.characterClass, level: req.level, subclass: null }],
        level: req.level,
        max_hp: req.maxHp,
        current_hp: req.maxHp,
        armor_class: req.armorClass,
        spell_slots: req.spellSlots,
        race: req.details.race ?? null,
        background: req.details.background ?? null,
        ability_scores: req.details.abilityScores ?? null,
        speed: req.details.speed ?? null,
        passive_perception: req.details.passivePerception ?? null,
        personality_traits: req.details.personalityTraits ?? null,
        ideals: req.details.ideals ?? null,
        bonds: req.details.bonds ?? null,
        flaws: req.details.flaws ?? null,
        backstory: req.details.backstory ?? null,
      })
      .select()
      .single()

    if (error || !data) {
      return new StoreCharacterResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }

    return new StoreCharacterResponse(req.correlationId, rowToCharacter(data))
  }
}
