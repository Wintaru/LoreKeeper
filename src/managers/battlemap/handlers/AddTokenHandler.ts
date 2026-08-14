import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { IBattleMapAccessor } from '@/accessors/battlemap/IBattleMapAccessor'
import { StoreTokenRequest } from '@/accessors/battlemap/BattleMapRequests'
import { TokenResponse as AccessorTokenResponse } from '@/accessors/battlemap/BattleMapResponses'
import { AddTokenRequest } from '../BattleMapRequests'
import { TokenResponse } from '../BattleMapResponses'

export class AddTokenHandler implements IHandler {
  constructor(private readonly battleMapAccessor: IBattleMapAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as AddTokenRequest
    const result = (await this.battleMapAccessor.store(
      new StoreTokenRequest(
        req.campaignId, req.battleMapId, req.kind, req.characterId,
        req.name, req.baseName, req.libraryKey, req.imageUrl, req.storagePath,
        req.color, req.x, req.y,
      )
    )) as AccessorTokenResponse

    if (!result.success) {
      return new TokenResponse(req.correlationId, null, result.errorMessage ?? 'Failed to add token')
    }
    return new TokenResponse(req.correlationId, result.token)
  }
}
