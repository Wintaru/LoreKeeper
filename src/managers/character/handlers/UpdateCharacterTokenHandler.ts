import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import { UpdateCharacterTokenRequest as AccessorRequest } from '@/accessors/character/CharacterRequests'
import { UpdateCharacterTokenRequest } from '../CharacterRequests'

export class UpdateCharacterTokenHandler implements IHandler {
  constructor(private readonly characterAccessor: ICharacterAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateCharacterTokenRequest
    return this.characterAccessor.store(
      new AccessorRequest(req.characterId, req.tokenImageUrl, req.tokenStoragePath, req.tokenColor)
    )
  }
}
