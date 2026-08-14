import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { LoadTokensRequest } from '@/accessors/battlemap/BattleMapRequests'
import { TokensResponse as AccessorTokensResponse } from '@/accessors/battlemap/BattleMapResponses'
import { GetTokensRequest } from '../BattleMapRequests'
import { TokensResponse } from '../BattleMapResponses'

export class GetTokensHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetTokensRequest
    const result = (await this.battleMapAccessor.load(
      new LoadTokensRequest(req.battleMapId)
    )) as AccessorTokensResponse

    if (!result.success) {
      return new TokensResponse(req.correlationId, [], result.errorMessage ?? 'Failed to load tokens')
    }
    return new TokensResponse(req.correlationId, result.tokens)
  }
}
