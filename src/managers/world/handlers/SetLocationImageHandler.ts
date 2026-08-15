import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IWorldAccessor } from '@/accessors/world/IWorldAccessor'
import { SetLocationImageRequest as AccessorSetLocationImageRequest } from '@/accessors/world/WorldRequests'
import { StoreLocationResponse } from '@/accessors/world/WorldResponses'
import { SetLocationImageRequest } from '../WorldRequests'
import { LocationResponse } from '../WorldResponses'

export class SetLocationImageHandler implements IHandler {
  constructor(private readonly worldAccessor: IWorldAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetLocationImageRequest
    const result = (await this.worldAccessor.store(
      new AccessorSetLocationImageRequest(req.locationId, req.imageUrl, req.imageStoragePath)
    )) as StoreLocationResponse

    if (!result.success || !result.location) {
      return new LocationResponse(req.correlationId, null, result.errorMessage ?? 'Failed to set location image')
    }
    return new LocationResponse(req.correlationId, result.location)
  }
}
