import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { UpdateTokenRequest as AccessorUpdateTokenRequest } from '@/accessors/battlemap/BattleMapRequests'
import { TokenResponse as AccessorTokenResponse } from '@/accessors/battlemap/BattleMapResponses'
import { UpdateTokenRequest } from '../BattleMapRequests'
import { TokenResponse } from '../BattleMapResponses'

export class UpdateTokenHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateTokenRequest
    const result = (await this.battleMapAccessor.store(
      new AccessorUpdateTokenRequest(req.tokenId, req.patch)
    )) as AccessorTokenResponse

    if (!result.success) {
      return new TokenResponse(req.correlationId, null, result.errorMessage ?? 'Failed to update token')
    }
    return new TokenResponse(req.correlationId, result.token)
  }
}
