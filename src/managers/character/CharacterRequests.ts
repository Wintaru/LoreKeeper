import { RequestBase } from '@/common/RequestBase'
import type { DeathSaves, Condition, SpellSlot, CustomCurrencyEntry, ClassLevel, AbilityScores } from '@/types'

export class UpdateHpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly newHp: number,
  ) { super() }
}

export class UpdateConditionsRequest extends RequestBase {
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

export class AwardXpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly xpToAdd: number,
  ) { super() }
}

/**
 * Take one level in `className` — an existing class or a brand-new one.
 * `hpGain` is the hit points added by the level (the UI defaults it to the
 * class's hit-die average plus the Constitution modifier).
 */
export class LevelUpClassRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly className: string,
    public readonly hpGain: number,
    public readonly subclass: string | null = null,
  ) { super() }
}

/**
 * Replaces the whole class line-up outright. Backs the DM's manual class
 * editing and the "undo last level-up" action, which restores the class list
 * and HP captured before the level was taken.
 */
export class SetCharacterClassesRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly classes: ClassLevel[],
    public readonly maxHp: number,
    public readonly currentHp: number,
  ) { super() }
}

export class WhisperRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly message: string,
  ) { super() }
}

export class KickPlayerRequest extends RequestBase {
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
