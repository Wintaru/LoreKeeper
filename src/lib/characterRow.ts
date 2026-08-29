import type { Character, ClassLevel } from '@/types'
import { resolveClasses } from '@/data/multiclass'

// Single mapper from a `characters` row to the domain `Character`.
//
// This previously existed as four byte-identical copies (LoadCharacterHandler,
// LoadRosterHandler, StoreCharacterHandler and the player campaign page), which
// meant adding a column required four edits and any missed one silently dropped
// the field. It is a pure shape translation with no I/O, so both the Accessor
// handlers and the client page can share it.

export function rowToCharacter(row: Record<string, unknown>): Character {
  const characterClass = row.class as string
  const level = row.level as number
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    playerName: row.player_name as string,
    characterName: row.character_name as string,
    class: characterClass,
    classes: resolveClasses(row.classes as ClassLevel[] | null, characterClass, level),
    race: (row.race as string) ?? null,
    background: (row.background as string) ?? null,
    level,
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
