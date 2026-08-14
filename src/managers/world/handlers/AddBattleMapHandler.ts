import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { StoreBattleMapRequest } from '@/accessors/world/WorldRequests'
import { StoreBattleMapResponse } from '@/accessors/world/WorldResponses'
import { AddBattleMapRequest } from '../WorldRequests'
import { BattleMapResponse } from '../WorldResponses'

export class AddBattleMapHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as AddBattleMapRequest
    const result = (await this.worldAccessor.store(
      new StoreBattleMapRequest(req.campaignId, req.name, req.type, req.storagePath, req.imageUrl)
    )) as StoreBattleMapResponse

    if (!result.success) {
      return new BattleMapResponse(req.correlationId, null, result.errorMessage ?? 'Failed to store battle map')
    }

    return new BattleMapResponse(req.correlationId, result.map)
  }
}
