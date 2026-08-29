import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import { UpdateSpellSlotsRequest } from '../CharacterRequests'
import { UpdateCharacterResponse } from '../CharacterResponses'
import {
  LoadCharacterRequest,
  UpdateSpellSlotsRequest as AccessorUpdateSpellSlotsRequest,
} from '@/accessors/character/CharacterRequests'
import { LoadCharacterResponse } from '@/accessors/character/CharacterResponses'
import { maxSpellSlotLevelForCharacterLevel, maxPactSlotLevelForCharacterLevel } from '@/data/spellSlots'

// This route is player self-service (no DM PIN — see the route comment), so
// this is the only real backstop against a level 1 character ending up with
// a 9th-level spell slot: the manual "add a slot" editor already restricts
// its dropdown to legal levels, but that's client-side UX, not enforcement.
export class UpdateSpellSlotsHandler implements IHandler {
  constructor(private readonly characterAccessor: ICharacterAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateSpellSlotsRequest

    const loadResult = (await this.characterAccessor.load(
      new LoadCharacterRequest(req.characterId)
    )) as LoadCharacterResponse
    if (!loadResult.success || !loadResult.character) {
      return new UpdateCharacterResponse(req.correlationId, false, loadResult.errorMessage ?? 'Character not found')
    }

    const maxSpellLevel = maxSpellSlotLevelForCharacterLevel(loadResult.character.level)
    const maxPactLevel = maxPactSlotLevelForCharacterLevel(loadResult.character.level)
    const overCap = req.spellSlots.find(s =>
      s.level > (s.kind === 'pact' ? maxPactLevel : maxSpellLevel)
    )
    if (overCap) {
      return new UpdateCharacterResponse(
        req.correlationId, false,
        `A level ${loadResult.character.level} character cannot have a level ${overCap.level} ${overCap.kind === 'pact' ? 'Pact Magic' : 'spell'} slot`,
      )
    }

    const result = await this.characterAccessor.store(
      new AccessorUpdateSpellSlotsRequest(req.characterId, req.spellSlots)
    )
    return new UpdateCharacterResponse(req.correlationId, result.success, result.errorMessage ?? undefined)
  }
}
