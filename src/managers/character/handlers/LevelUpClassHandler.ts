import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import type { ISpellcastingEngine } from '@/engines/spellcasting/ISpellcastingEngine'
import type { INotificationAccessor } from '@/accessors/notification/INotificationAccessor'
import { LoadCharacterRequest } from '@/accessors/character/CharacterRequests'
import { LoadCharacterResponse } from '@/accessors/character/CharacterResponses'
import { SendPushRequest } from '@/accessors/notification/NotificationRequests'
import { addClassLevel, formatClassLine, resolveClasses } from '@/data/multiclass'
import { LevelUpClassRequest } from '../CharacterRequests'
import { UpdateCharacterClassesResponse } from '../CharacterResponses'
import { persistClasses } from './persistClasses'

/**
 * Takes one level in a class — either one the character already has, or a new
 * one (multiclassing). Total character level is simply the sum of class levels,
 * so XP thresholds and proficiency bonus need no special handling here: they
 * are already driven off the total everywhere else in the app.
 *
 * Ability score prerequisites are deliberately NOT enforced. This is a DM tool;
 * the UI surfaces unmet prerequisites as a warning so the DM can knowingly
 * allow an exception.
 */
export class LevelUpClassHandler implements IHandler {
  constructor(
    private readonly characterAccessor: ICharacterAccessor,
    private readonly spellcastingEngine: ISpellcastingEngine,
    private readonly notificationAccessor: INotificationAccessor,
  ) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LevelUpClassRequest

    const loadResult = (await this.characterAccessor.load(
      new LoadCharacterRequest(req.characterId)
    )) as LoadCharacterResponse

    if (!loadResult.success || !loadResult.character) {
      return new UpdateCharacterClassesResponse(
        req.correlationId, null,
        loadResult.errorMessage ?? 'Character not found',
      )
    }

    const character = loadResult.character
    const current = resolveClasses(character.classes, character.class, character.level)

    let updated = addClassLevel(current, req.className, 1)
    if (req.subclass) {
      const key = req.className.toLowerCase().trim()
      updated = updated.map(c =>
        c.name.toLowerCase().trim() === key ? { ...c, subclass: req.subclass } : c
      )
    }

    // A level always adds its hit points to both the maximum and the current
    // pool — gaining a level should not leave the character proportionally
    // more wounded than they were a moment earlier.
    const hpGain = Math.max(0, req.hpGain)

    const result = await persistClasses(this.characterAccessor, this.spellcastingEngine, {
      correlationId: req.correlationId,
      characterId: req.characterId,
      classes: updated,
      maxHp: character.maxHp + hpGain,
      currentHp: character.currentHp + hpGain,
    })

    if (result.success && character.pushSubscription) {
      await this.notificationAccessor.send(
        new SendPushRequest(
          character.pushSubscription,
          'Level Up!',
          `${character.characterName} is now ${formatClassLine(result.classes)}.`,
        )
      )
    }

    return result
  }
}
