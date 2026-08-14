import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { RemoveBattleMapRequest } from '@/accessors/world/WorldRequests'
import { RemoveBattleMapResponse } from '@/accessors/world/WorldResponses'
import { DeleteBattleMapRequest } from '../WorldRequests'
import { DeleteResponse } from '../WorldResponses'

export class DeleteBattleMapHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as DeleteBattleMapRequest
    const result = (await this.worldAccessor.remove(
      new RemoveBattleMapRequest(req.mapId, req.storagePath)
    )) as RemoveBattleMapResponse

    return new DeleteResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
