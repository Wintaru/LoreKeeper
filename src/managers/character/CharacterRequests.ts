import { RequestBase } from '@/common/RequestBase'
import type { DeathSaves, Condition, SpellSlot, CustomCurrencyEntry } from '@/types'

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

export class AwardXpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly xpToAdd: number,
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
