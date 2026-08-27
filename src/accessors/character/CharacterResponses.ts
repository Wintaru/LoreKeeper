import { ResponseBase } from '@/common/ResponseBase'
import type { Character, RosterSummary } from '@/types'

export class StoreCharacterResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly character: Character | null

  constructor(correlationId: string, character: Character | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.character = character
    this.success = character !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class LoadRosterResponse extends ResponseBase {
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

export class LoadRosterSummaryResponse extends ResponseBase {
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

export class UpdateCharacterResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class UpdateConditionsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class UpdateDeathSavesResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class UpdateSpellSlotsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class LoadCharacterResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly character: Character | null

  constructor(correlationId: string, character: Character | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.character = character
    this.success = character !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class UpdateCharacterCurrencyResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class UpdateXpResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}
