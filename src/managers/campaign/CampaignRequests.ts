import { RequestBase } from '@/common/RequestBase'
import type { SpellSlot, CharacterDetails } from '@/types'

export class CreateCampaignRequest extends RequestBase {
  constructor(public readonly dmPin: string) { super() }
}

export class JoinCampaignRequest extends RequestBase {
  constructor(
    public readonly campaignCode: string,
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

export class GetRosterRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class GetRosterSummaryRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class ValidateDmPinRequest extends RequestBase {
  constructor(
    public readonly campaignCode: string,
    public readonly dmPin: string,
  ) { super() }
}
