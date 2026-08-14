import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { SetFogRequest as AccessorSetFogRequest } from '@/accessors/battlemap/BattleMapRequests'
import { FogResponse as AccessorFogResponse } from '@/accessors/battlemap/BattleMapResponses'
import { SetFogRequest } from '../BattleMapRequests'
import { FogResponse } from '../BattleMapResponses'

export class SetFogHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetFogRequest
    const result = (await this.battleMapAccessor.store(
      new AccessorSetFogRequest(req.battleMapId, req.strokes)
    )) as AccessorFogResponse

    return new FogResponse(req.correlationId, result.fog, result.errorMessage ?? undefined)
  }
}
