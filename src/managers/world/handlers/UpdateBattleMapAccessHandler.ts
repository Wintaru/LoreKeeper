import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { UpdateBattleMapAccessRequest as AccessorUpdateBattleMapAccessRequest } from '@/accessors/world/WorldRequests'
import { UpdateBattleMapAccessResponse } from '@/accessors/world/WorldResponses'
import { UpdateBattleMapAccessRequest } from '../WorldRequests'
import { DeleteResponse } from '../WorldResponses'

export class UpdateBattleMapAccessHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateBattleMapAccessRequest
    const result = (await this.worldAccessor.store(
      new AccessorUpdateBattleMapAccessRequest(req.campaignId, req.battleMapAccessGranted, req.sharedBattleMapIds, req.battleMapViewport)
    )) as UpdateBattleMapAccessResponse

    return new DeleteResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
