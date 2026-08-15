import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { SetNpcImageRequest as AccessorSetNpcImageRequest } from '@/accessors/world/WorldRequests'
import { StoreNpcResponse } from '@/accessors/world/WorldResponses'
import { SetNpcImageRequest } from '../WorldRequests'
import { NpcResponse } from '../WorldResponses'

export class SetNpcImageHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetNpcImageRequest
    const result = (await this.worldAccessor.store(
      new AccessorSetNpcImageRequest(req.npcId, req.imageUrl, req.imageStoragePath)
    )) as StoreNpcResponse

    if (!result.success || !result.npc) {
      return new NpcResponse(req.correlationId, null, result.errorMessage ?? 'Failed to set NPC image')
    }
    return new NpcResponse(req.correlationId, result.npc)
  }
}
