import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import { UpdateShareInventoryRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'
import { UpdateShareInventoryRequest as AccessorUpdateShareInventoryRequest } from '@/accessors/character/CharacterRequests'

export class UpdateShareInventoryHandler implements IHandler {
  constructor(private readonly characterAccessor: ICharacterAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateShareInventoryRequest
    const result = await this.characterAccessor.store(
      new AccessorUpdateShareInventoryRequest(req.characterId, req.shareInventoryWithParty)
    )
    return new UpdateCharacterResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
