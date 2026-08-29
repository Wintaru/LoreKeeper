import { RequestBase } from '@/common/RequestBase'
import type { ClassLevel } from '@/types'

export class CalculateSpellSlotsRequest extends RequestBase {
  constructor(public readonly classes: ClassLevel[]) { super() }
}
