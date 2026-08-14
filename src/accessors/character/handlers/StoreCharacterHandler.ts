import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreCharacterRequest } from '../CharacterRequests'
import { StoreCharacterResponse } from '../CharacterResponses'
import type { Character } from '@/types'

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

function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    playerName: row.player_name as string,
    characterName: row.character_name as string,
    class: row.class as string,
    race: (row.race as string) ?? null,
    background: (row.background as string) ?? null,
    level: row.level as number,
    xp: (row.xp as number) ?? 0,
    maxHp: row.max_hp as number,
    currentHp: row.current_hp as number,
    armorClass: row.armor_class as number,
    speed: (row.speed as number) ?? null,
    passivePerception: (row.passive_perception as number) ?? null,
    abilityScores: (row.ability_scores as Character['abilityScores']) ?? null,
    personalityTraits: (row.personality_traits as string) ?? null,
    ideals: (row.ideals as string) ?? null,
    bonds: (row.bonds as string) ?? null,
    flaws: (row.flaws as string) ?? null,
    backstory: (row.backstory as string) ?? null,
    deathSaves: (row.death_saves as Character['deathSaves']) ?? { successes: 0, failures: 0 },
    spellSlots: (row.spell_slots as Character['spellSlots']) ?? [],
    conditions: (row.conditions as Character['conditions']) ?? [],
    loot: (row.loot as Character['loot']) ?? [],
    gold: (row.gold as number) ?? 0,
    silver: (row.silver as number) ?? 0,
    copper: (row.copper as number) ?? 0,
    customCurrency: (row.custom_currency as Character['customCurrency']) ?? [],
    pushSubscription: (row.push_subscription as Character['pushSubscription']) ?? null,
    isActive: row.is_active as boolean,
    tokenImageUrl: (row.token_image_url as string) ?? null,
    tokenStoragePath: (row.token_storage_path as string) ?? null,
    tokenColor: (row.token_color as string) ?? '#b45309',
    createdAt: new Date(row.created_at as string),
  }
}
