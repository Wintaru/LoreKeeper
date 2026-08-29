import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import { UpdateCharacterStatsRequest as AccessorRequest } from '@/accessors/character/CharacterRequests'
import { UpdateCharacterStatsRequest } from '../CharacterRequests'

export class UpdateCharacterStatsHandler implements IHandler {
  constructor(private readonly characterAccessor: ICharacterAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateCharacterStatsRequest
    return this.characterAccessor.store(
      new AccessorRequest(req.characterId, req.maxHp, req.currentHp, req.armorClass, req.speed, req.passivePerception, req.abilityScores)
    )
  }
}
