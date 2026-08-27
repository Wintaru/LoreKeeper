import { ResponseBase } from '@/common/ResponseBase'
import type { Campaign, Character, RosterSummary } from '@/types'

export class CreateCampaignResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly campaign: Campaign | null

  constructor(correlationId: string, campaign: Campaign | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.campaign = campaign
    this.success = campaign !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class JoinCampaignResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly character: Character | null
  readonly campaign: Campaign | null

  constructor(
    correlationId: string,
    character: Character | null,
    campaign: Campaign | null,
    errorMessage?: string,
  ) {
    super()
    this.correlationId = correlationId
    this.character = character
    this.campaign = campaign
    this.success = character !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetRosterResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly characters: Character[]

  constructor(correlationId: string, characters: Character[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.characters = characters
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class GetRosterSummaryResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly characters: RosterSummary[]

  constructor(correlationId: string, characters: RosterSummary[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.characters = characters
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class ValidateDmPinResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly campaign: Campaign | null

  constructor(correlationId: string, campaign: Campaign | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.campaign = campaign
    this.success = campaign !== null
    this.errorMessage = errorMessage ?? null
  }
}
