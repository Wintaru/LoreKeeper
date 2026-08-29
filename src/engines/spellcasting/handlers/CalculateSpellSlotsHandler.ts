import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import { calculateSpellcasting } from '@/data/multiclass'
import { CalculateSpellSlotsRequest } from '../SpellcastingEngineRequests'
import { CalculateSpellSlotsResponse } from '../SpellcastingEngineResponses'

/**
 * Turns a class line-up into the character's full spell slot allocation.
 *
 * The rules maths lives in `@/data/multiclass` so the level-up UI can render an
 * identical preview without reaching through a Manager into this Engine — the
 * same arrangement `@/data/spellSlots` already has with LevelUpModal. This
 * handler is the authoritative, server-side entry point for it.
 */
export class CalculateSpellSlotsHandler implements IHandler {
  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as CalculateSpellSlotsRequest
    const result = calculateSpellcasting(req.classes)

    return new CalculateSpellSlotsResponse(
      req.correlationId,
      [...result.spellSlots, ...result.pactSlots],
      result.multiclassCasterLevel,
      result.method,
    )
  }
}
