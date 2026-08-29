import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import type { ISpellcastingEngine } from '@/engines/spellcasting/ISpellcastingEngine'
import { SetCharacterClassesRequest } from '../CharacterRequests'
import { persistClasses } from './persistClasses'

/**
 * Replaces a character's class line-up wholesale and re-derives everything that
 * follows from it. Backs manual DM class editing and "undo last level-up",
 * which simply re-applies the class list and HP snapshot taken before the level.
 */
export class SetCharacterClassesHandler implements IHandler {
  constructor(
    private readonly characterAccessor: ICharacterAccessor,
    private readonly spellcastingEngine: ISpellcastingEngine,
  ) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetCharacterClassesRequest
    return persistClasses(this.characterAccessor, this.spellcastingEngine, {
      correlationId: req.correlationId,
      characterId: req.characterId,
      classes: req.classes,
      maxHp: req.maxHp,
      currentHp: req.currentHp,
    })
  }
}
