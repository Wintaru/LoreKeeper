import { ResponseBase } from '@/common/ResponseBase'
import type { ClassLevel, SpellSlot } from '@/types'

export class UpdateCharacterClassesResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly classes: ClassLevel[]
  /** Total character level = sum of all class levels. */
  readonly totalLevel: number
  readonly primaryClass: string
  readonly spellSlots: SpellSlot[]
  readonly maxHp: number
  readonly currentHp: number
  /** Combined caster level against the Multiclass Spellcaster table, or null. */
  readonly multiclassCasterLevel: number | null

  constructor(
    correlationId: string,
    data: {
      classes: ClassLevel[]
      totalLevel: number
      primaryClass: string
      spellSlots: SpellSlot[]
      maxHp: number
      currentHp: number
      multiclassCasterLevel: number | null
    } | null,
    errorMessage?: string,
  ) {
    super()
    this.correlationId = correlationId
    this.classes = data?.classes ?? []
    this.totalLevel = data?.totalLevel ?? 0
    this.primaryClass = data?.primaryClass ?? ''
    this.spellSlots = data?.spellSlots ?? []
    this.maxHp = data?.maxHp ?? 0
    this.currentHp = data?.currentHp ?? 0
    this.multiclassCasterLevel = data?.multiclassCasterLevel ?? null
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

export class AwardXpResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly newXp: number
  readonly newLevel: number
  readonly leveledUp: boolean

  constructor(
    correlationId: string,
    newXp: number,
    newLevel: number,
    leveledUp: boolean,
    errorMessage?: string,
  ) {
    super()
    this.correlationId = correlationId
    this.newXp = newXp
    this.newLevel = newLevel
    this.leveledUp = leveledUp
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class WhisperResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly sent: boolean

  constructor(correlationId: string, sent: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.sent = sent
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}
