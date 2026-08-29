import { RequestBase } from '@/common/RequestBase'
import type { SpellSlot, Condition, DeathSaves, CustomCurrencyEntry, CharacterDetails, ClassLevel, AbilityScores } from '@/types'

export class StoreCharacterRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly playerName: string,
    public readonly characterName: string,
    public readonly characterClass: string,
    public readonly level: number,
    public readonly maxHp: number,
    public readonly armorClass: number,
    public readonly spellSlots: SpellSlot[] = [],
    public readonly details: CharacterDetails = {},
  ) { super() }
}

export class LoadRosterRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class LoadRosterSummaryRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class UpdateCharacterHpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly currentHp: number,
  ) { super() }
}

export class UpdateCharacterConditionsRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly conditions: Condition[],
  ) { super() }
}

export class UpdateDeathSavesRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly deathSaves: DeathSaves,
  ) { super() }
}

export class UpdateSpellSlotsRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly spellSlots: SpellSlot[],
  ) { super() }
}

export class UpdateShareInventoryRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly shareInventoryWithParty: boolean,
  ) { super() }
}

export class LoadCharacterRequest extends RequestBase {
  constructor(public readonly characterId: string) { super() }
}

// XP only. `level` is NOT written here: with multiclassing, total character
// level is the sum of the per-class levels and changes only when a class level
// is actually taken (UpdateCharacterClassesRequest). Crossing an XP threshold
// makes a level *available*; it no longer silently sets the number.
export class UpdateXpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly xp: number,
  ) { super() }
}

// Writes the class line-up together with every value derived from it. These are
// one atomic UPDATE on purpose: `level` is the sum of the class levels and
// `spell_slots` is recomputed from them, so persisting them separately would
// leave the row briefly (or permanently, on a failure) self-inconsistent.
// All derivation happens in the Manager/Engine — this Accessor only writes.
export class UpdateCharacterClassesRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly classes: ClassLevel[],
    public readonly primaryClass: string,
    public readonly totalLevel: number,
    public readonly maxHp: number,
    public readonly currentHp: number,
    public readonly spellSlots: SpellSlot[],
    // Set only when XP must land in the same write as the class change (the
    // automatic single-class level-up path) — otherwise a second, separate
    // UpdateXpRequest could succeed or fail independently of this one and
    // leave xp and level out of sync.
    public readonly xp?: number,
  ) { super() }
}

export class KickCharacterRequest extends RequestBase {
  constructor(public readonly characterId: string) { super() }
}

export class UpdateCharacterStatsRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly maxHp: number,
    public readonly currentHp: number,
    public readonly armorClass: number,
    public readonly speed: number | null,
    public readonly passivePerception: number | null,
    public readonly abilityScores: AbilityScores | null,
  ) { super() }
}

export class UpdateCharacterTokenRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly tokenImageUrl: string | null,
    public readonly tokenStoragePath: string | null,
    public readonly tokenColor: string,
  ) { super() }
}

export class UpdateCharacterCurrencyRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly gold: number,
    public readonly silver: number,
    public readonly copper: number,
    public readonly customCurrency: CustomCurrencyEntry[],
  ) { super() }
}
