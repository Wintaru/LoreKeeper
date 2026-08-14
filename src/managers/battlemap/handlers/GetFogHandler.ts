import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { GetFogRequest as AccessorGetFogRequest } from '@/accessors/battlemap/BattleMapRequests'
import { FogResponse as AccessorFogResponse } from '@/accessors/battlemap/BattleMapResponses'
import { GetFogRequest } from '../BattleMapRequests'
import { FogResponse } from '../BattleMapResponses'

export class GetFogHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetFogRequest
    const result = (await this.battleMapAccessor.load(
      new AccessorGetFogRequest(req.battleMapId)
    )) as AccessorFogResponse

    return new FogResponse(req.correlationId, result.fog, result.errorMessage ?? undefined)
  }
}
