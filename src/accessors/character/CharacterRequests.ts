import { RequestBase } from '@/common/RequestBase'
import type { SpellSlot, Condition, DeathSaves, CustomCurrencyEntry, CharacterDetails } from '@/types'

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

export class LoadCharacterRequest extends RequestBase {
  constructor(public readonly characterId: string) { super() }
}

export class UpdateXpRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly xp: number,
    public readonly level: number,
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
