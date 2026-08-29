import { ResponseBase } from '@/common/ResponseBase'
import type { SpellSlot } from '@/types'

export class CalculateSpellSlotsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  /** Shared Spellcasting slots followed by any Warlock Pact Magic slots. */
  readonly spellSlots: SpellSlot[]
  /** Combined caster level used against the Multiclass Spellcaster table, or null. */
  readonly multiclassCasterLevel: number | null
  readonly method: 'none' | 'single-class' | 'multiclass-table'

  constructor(
    correlationId: string,
    spellSlots: SpellSlot[],
    multiclassCasterLevel: number | null,
    method: 'none' | 'single-class' | 'multiclass-table',
  ) {
    super()
    this.correlationId = correlationId
    this.spellSlots = spellSlots
    this.multiclassCasterLevel = multiclassCasterLevel
    this.method = method
    this.success = true
    this.errorMessage = null
  }
}
