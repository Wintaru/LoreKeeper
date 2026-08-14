import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { LoadLibraryRequest } from '@/accessors/battlemap/BattleMapRequests'
import { LibraryResponse as AccessorLibraryResponse } from '@/accessors/battlemap/BattleMapResponses'
import { GetLibraryRequest } from '../BattleMapRequests'
import { LibraryResponse } from '../BattleMapResponses'

export class GetLibraryHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetLibraryRequest
    const result = (await this.battleMapAccessor.load(
      new LoadLibraryRequest(req.campaignId)
    )) as AccessorLibraryResponse

    if (!result.success) {
      return new LibraryResponse(req.correlationId, [], result.errorMessage ?? 'Failed to load library')
    }
    return new LibraryResponse(req.correlationId, result.entries)
  }
}
