import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { StoreAnnotationRequest } from '@/accessors/battlemap/BattleMapRequests'
import { AnnotationResponse as AccessorAnnotationResponse } from '@/accessors/battlemap/BattleMapResponses'
import { AddAnnotationRequest } from '../BattleMapRequests'
import { AnnotationResponse } from '../BattleMapResponses'

export class AddAnnotationHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as AddAnnotationRequest
    const result = (await this.battleMapAccessor.store(
      new StoreAnnotationRequest(req.battleMapId, req.kind, req.data)
    )) as AccessorAnnotationResponse

    if (!result.success) {
      return new AnnotationResponse(req.correlationId, null, result.errorMessage ?? 'Failed to add annotation')
    }
    return new AnnotationResponse(req.correlationId, result.annotation)
  }
}
