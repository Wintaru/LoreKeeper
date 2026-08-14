import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { RemoveTokenRequest } from '@/accessors/battlemap/BattleMapRequests'
import { AckResponse } from '@/accessors/battlemap/BattleMapResponses'
import { DeleteTokenRequest } from '../BattleMapRequests'
import { DeleteResponse } from '../BattleMapResponses'

export class DeleteTokenHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as DeleteTokenRequest
    const result = (await this.battleMapAccessor.remove(
      new RemoveTokenRequest(req.tokenId)
    )) as AckResponse

    return new DeleteResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
