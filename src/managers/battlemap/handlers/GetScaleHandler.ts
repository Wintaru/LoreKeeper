import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { GetScaleRequest as AccessorGetScaleRequest } from '@/accessors/battlemap/BattleMapRequests'
import { ScaleResponse as AccessorScaleResponse } from '@/accessors/battlemap/BattleMapResponses'
import { GetScaleRequest } from '../BattleMapRequests'
import { ScaleResponse } from '../BattleMapResponses'

export class GetScaleHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetScaleRequest
    const result = (await this.battleMapAccessor.load(
      new AccessorGetScaleRequest(req.battleMapId)
    )) as AccessorScaleResponse

    return new ScaleResponse(req.correlationId, result.scale, result.errorMessage ?? undefined)
  }
}
