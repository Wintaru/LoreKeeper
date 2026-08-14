import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { StoreLibraryEntryRequest } from '@/accessors/battlemap/BattleMapRequests'
import { LibraryEntryResponse as AccessorLibraryEntryResponse } from '@/accessors/battlemap/BattleMapResponses'
import { AddLibraryEntryRequest } from '../BattleMapRequests'
import { LibraryEntryResponse } from '../BattleMapResponses'

export class AddLibraryEntryHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as AddLibraryEntryRequest
    const result = (await this.battleMapAccessor.store(
      new StoreLibraryEntryRequest(req.campaignId, req.name, req.baseName, req.imageUrl, req.storagePath, req.color)
    )) as AccessorLibraryEntryResponse

    if (!result.success) {
      return new LibraryEntryResponse(req.correlationId, null, result.errorMessage ?? 'Failed to add library entry')
    }
    return new LibraryEntryResponse(req.correlationId, result.entry)
  }
}
