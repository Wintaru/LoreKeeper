import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { RemoveLibraryEntryRequest } from '@/accessors/battlemap/BattleMapRequests'
import { AckResponse } from '@/accessors/battlemap/BattleMapResponses'
import { DeleteLibraryEntryRequest } from '../BattleMapRequests'
import { DeleteResponse } from '../BattleMapResponses'

export class DeleteLibraryEntryHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as DeleteLibraryEntryRequest
    const result = (await this.battleMapAccessor.remove(
      new RemoveLibraryEntryRequest(req.entryId, req.storagePath)
    )) as AckResponse

    return new DeleteResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
