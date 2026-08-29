import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import { xpToLevel } from '@/data/leveling'
import { CalculateLevelRequest } from '../XpEngineRequests'
import { CalculateLevelResponse } from '../XpEngineResponses'

// The XP threshold table now lives in `@/data/leveling` — it was previously
// duplicated here, in the DM panel and in the player sheet.
//
// This returns TOTAL character level, which is what XP buys. It is unaffected
// by multiclassing: how that total is split across classes is tracked
// separately on `characters.classes`.
export class CalculateLevelHandler implements IHandler {
  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as CalculateLevelRequest
    return new CalculateLevelResponse(req.correlationId, xpToLevel(req.xp))
  }
}
