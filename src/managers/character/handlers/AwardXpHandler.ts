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

    // Level earned by the OLD xp total — only used for the multiclass
    // "level available" notification below, not for deciding what to persist.
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

    const currentClasses = resolveClasses(character.classes, character.class, character.level)
    const isSingleClassed = currentClasses.length === 1
    // Compare against the character's ACTUAL stored level, not the level the
    // old XP total would have earned — those can already differ (e.g. a DM
    // manually set the level), and it's the stored level that must track XP.
    const levelDelta = newLevel - character.level

    // Single-classed characters have nowhere else the level could go, so XP
    // auto-applies it exactly as it did before multiclassing existed — in
    // EITHER direction, since removing XP must bring the level back down
    // too, not just leave a stale higher level in place. A multiclassed
    // character's level is ambiguous (which class gets it, which loses it?),
    // so there XP only ever makes a level available/short — the DM chooses
    // via LevelUpClassRequest or the class-level editor.
    if (isSingleClassed && levelDelta !== 0) {
      const only = currentClasses[0]
      // At least 1 HP per level, same floor the manual level-up UI applies —
      // a very low CON modifier must not zero out a multi-level HP swing.
      const hpPerLevel = Math.max(1, hitDieAverage(getHitDie(only.name)) + abilityModifier(character.abilityScores?.con ?? 10))
      const totalHpChange = hpPerLevel * levelDelta
      const updatedClasses = addClassLevel(currentClasses, only.name, levelDelta)
      const newMaxHp = Math.max(1, character.maxHp + totalHpChange)
      const newCurrentHp = Math.min(newMaxHp, Math.max(0, character.currentHp + totalHpChange))

      // Class change and XP are written in the SAME accessor call (`xp` on
      // persistClasses) so a mid-flight failure can't leave xp pointing at a
      // different level than the stored class line-up.
      const result = await persistClasses(this.characterAccessor, this.spellcastingEngine, {
        correlationId: req.correlationId,
        characterId: req.characterId,
        classes: updatedClasses,
        maxHp: newMaxHp,
        currentHp: newCurrentHp,
        xp: newXp,
      })

      if (!result.success) {
        return new AwardXpResponse(req.correlationId, 0, 0, false, result.errorMessage ?? 'Failed to update level')
      }

      if (levelDelta > 0 && character.pushSubscription) {
        await this.notificationAccessor.send(
          new SendPushRequest(
            character.pushSubscription,
            'Level Up!',
            `${character.characterName} is now ${formatClassLine(result.classes)}.`,
          )
        )
      }

      return new AwardXpResponse(req.correlationId, newXp, newLevel, levelDelta > 0)
    }

    // Multiclassed (or no level change): persist XP only, and notify that a
    // level is available.
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
