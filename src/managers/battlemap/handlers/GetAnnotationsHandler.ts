import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { LoadAnnotationsRequest } from '@/accessors/battlemap/BattleMapRequests'
import { AnnotationsResponse as AccessorAnnotationsResponse } from '@/accessors/battlemap/BattleMapResponses'
import { GetAnnotationsRequest } from '../BattleMapRequests'
import { AnnotationsResponse } from '../BattleMapResponses'

export class GetAnnotationsHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetAnnotationsRequest
    const result = (await this.battleMapAccessor.load(
      new LoadAnnotationsRequest(req.battleMapId)
    )) as AccessorAnnotationsResponse

    if (!result.success) {
      return new AnnotationsResponse(req.correlationId, [], result.errorMessage ?? 'Failed to load annotations')
    }
    return new AnnotationsResponse(req.correlationId, result.annotations)
  }
}
