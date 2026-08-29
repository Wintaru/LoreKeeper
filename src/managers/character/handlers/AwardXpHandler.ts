import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import type { IXpEngine } from '@/engines/xp/IXpEngine'
import type { ISpellcastingEngine } from '@/engines/spellcasting/ISpellcastingEngine'
import type { INotificationAccessor } from '@/accessors/notification/INotificationAccessor'
import { LoadCharacterRequest, UpdateXpRequest } from '@/accessors/character/CharacterRequests'
import { LoadCharacterResponse } from '@/accessors/character/CharacterResponses'
import { CalculateLevelRequest } from '@/engines/xp/XpEngineRequests'
import { CalculateLevelResponse } from '@/engines/xp/XpEngineResponses'
import { SendPushRequest } from '@/accessors/notification/NotificationRequests'
import { addClassLevel, formatClassLine, getHitDie, hitDieAverage, abilityModifier, resolveClasses } from '@/data/multiclass'
import { AwardXpRequest } from '../CharacterRequests'
import { AwardXpResponse } from '../CharacterResponses'
import { persistClasses } from './persistClasses'

export class AwardXpHandler implements IHandler {
  constructor(
    private readonly characterAccessor: ICharacterAccessor,
    private readonly xpEngine: IXpEngine,
    private readonly notificationAccessor: INotificationAccessor,
    private readonly spellcastingEngine: ISpellcastingEngine,
  ) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as AwardXpRequest

    // Load character
    const loadResult = (await this.characterAccessor.load(
      new LoadCharacterRequest(req.characterId)
    )) as LoadCharacterResponse

    if (!loadResult.success || !loadResult.character) {
      return new AwardXpResponse(req.correlationId, 0, 0, false, loadResult.errorMessage ?? 'Character not found')
    }

    const character = loadResult.character

    // Level earned by the OLD xp total.
    const oldLevelResult = (await this.xpEngine.evaluate(
      new CalculateLevelRequest(character.xp)
    )) as CalculateLevelResponse

    // Calculate new xp and the level it earns (floor at 0)
    const newXp = Math.max(0, character.xp + req.xpToAdd)
    const newLevelResult = (await this.xpEngine.evaluate(
      new CalculateLevelRequest(newXp)
    )) as CalculateLevelResponse

    const newLevel = newLevelResult.level
    const leveledUp = newLevel > oldLevelResult.level
    const levelsGained = newLevel - oldLevelResult.level

    const currentClasses = resolveClasses(character.classes, character.class, character.level)
    const isSingleClassed = currentClasses.length === 1

    // Single-classed characters have nowhere else the level could go, so XP
    // auto-applies it exactly as it did before multiclassing existed. A
    // multiclassed character's level is ambiguous (which class gets it?), so
    // crossing a threshold only makes a level AVAILABLE — the DM then chooses
    // via LevelUpClassRequest.
    if (leveledUp && isSingleClassed) {
      const only = currentClasses[0]
      const hpGain = hitDieAverage(getHitDie(only.name)) + abilityModifier(character.abilityScores?.con ?? 10)
      const totalHpGain = Math.max(0, hpGain * levelsGained)
      const updatedClasses = addClassLevel(currentClasses, only.name, levelsGained)

      const result = await persistClasses(this.characterAccessor, this.spellcastingEngine, {
        correlationId: req.correlationId,
        characterId: req.characterId,
        classes: updatedClasses,
        maxHp: character.maxHp + totalHpGain,
        currentHp: character.currentHp + totalHpGain,
      })

      if (!result.success) {
        return new AwardXpResponse(req.correlationId, 0, 0, false, result.errorMessage ?? 'Failed to level up')
      }

      const xpUpdate = await this.characterAccessor.store(new UpdateXpRequest(req.characterId, newXp))
      if (!xpUpdate.success) {
        return new AwardXpResponse(req.correlationId, 0, 0, false, xpUpdate.errorMessage ?? 'Failed to update XP')
      }

      if (character.pushSubscription) {
        await this.notificationAccessor.send(
          new SendPushRequest(
            character.pushSubscription,
            'Level Up!',
            `${character.characterName} is now ${formatClassLine(result.classes)}.`,
          )
        )
      }

      return new AwardXpResponse(req.correlationId, newXp, newLevel, leveledUp)
    }

    // Multiclassed: persist XP only, and notify that a level is available.
    const updateResult = await this.characterAccessor.store(
      new UpdateXpRequest(req.characterId, newXp)
    )

    if (!updateResult.success) {
      return new AwardXpResponse(req.correlationId, 0, 0, false, updateResult.errorMessage ?? 'Failed to update XP')
    }

    if (leveledUp && character.pushSubscription) {
      await this.notificationAccessor.send(
        new SendPushRequest(
          character.pushSubscription,
          'Level Up Available!',
          `${character.characterName} has earned level ${newLevel} — your DM will pick the class.`,
        )
      )
    }

    return new AwardXpResponse(req.correlationId, newXp, newLevel, leveledUp)
  }
}
