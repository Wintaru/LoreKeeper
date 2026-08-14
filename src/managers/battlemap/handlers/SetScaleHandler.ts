import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { SetScaleRequest as AccessorSetScaleRequest } from '@/accessors/battlemap/BattleMapRequests'
import { ScaleResponse as AccessorScaleResponse } from '@/accessors/battlemap/BattleMapResponses'
import { SetScaleRequest } from '../BattleMapRequests'
import { ScaleResponse } from '../BattleMapResponses'

export class SetScaleHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetScaleRequest
    const result = (await this.battleMapAccessor.store(
      new AccessorSetScaleRequest(req.battleMapId, req.feetPerUnit)
    )) as AccessorScaleResponse

    return new ScaleResponse(req.correlationId, result.scale, result.errorMessage ?? undefined)
  }
}
