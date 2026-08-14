import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { ClearAnnotationsRequest as AccessorClearAnnotationsRequest } from '@/accessors/battlemap/BattleMapRequests'
import { AckResponse } from '@/accessors/battlemap/BattleMapResponses'
import { ClearAnnotationsRequest } from '../BattleMapRequests'
import { DeleteResponse } from '../BattleMapResponses'

export class ClearAnnotationsHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as ClearAnnotationsRequest
    const result = (await this.battleMapAccessor.remove(
      new AccessorClearAnnotationsRequest(req.battleMapId, req.kind)
    )) as AckResponse

    return new DeleteResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
