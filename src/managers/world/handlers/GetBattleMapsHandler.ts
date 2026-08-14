import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { LoadBattleMapsRequest } from '@/accessors/world/WorldRequests'
import { LoadBattleMapsResponse } from '@/accessors/world/WorldResponses'
import { GetBattleMapsRequest } from '../WorldRequests'
import { GetBattleMapsResponse } from '../WorldResponses'

export class GetBattleMapsHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetBattleMapsRequest
    const result = (await this.worldAccessor.load(
      new LoadBattleMapsRequest(req.campaignId)
    )) as LoadBattleMapsResponse

    if (!result.success) {
      return new GetBattleMapsResponse(req.correlationId, [], result.errorMessage ?? 'Failed to load battle maps')
    }

    return new GetBattleMapsResponse(req.correlationId, result.maps)
  }
}
