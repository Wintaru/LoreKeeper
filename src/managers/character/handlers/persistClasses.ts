import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import type { ISpellcastingEngine } from '@/engines/spellcasting/ISpellcastingEngine'
import type { ClassLevel } from '@/types'
import { UpdateCharacterClassesRequest } from '@/accessors/character/CharacterRequests'
import { CalculateSpellSlotsRequest } from '@/engines/spellcasting/SpellcastingEngineRequests'
import { CalculateSpellSlotsResponse } from '@/engines/spellcasting/SpellcastingEngineResponses'
import { totalLevel, primaryClass } from '@/data/multiclass'
import { MAX_CHARACTER_LEVEL } from '@/data/leveling'
import { UpdateCharacterClassesResponse } from '../CharacterResponses'

/**
 * Shared tail of every class-changing Manager operation: derive the values that
 * hang off the class list, then persist them in one Accessor write.
 *
 * Both LevelUpClassHandler and SetCharacterClassesHandler end here so the
 * derivation rules (total level, primary class, spell slots) exist exactly once
 * and cannot drift between the "level up" and "undo/edit" paths.
 */
export async function persistClasses(
  characterAccessor: ICharacterAccessor,
  spellcastingEngine: ISpellcastingEngine,
  args: {
    correlationId: string
    characterId: string
    classes: ClassLevel[]
    maxHp: number
    currentHp: number
    /** Set only when XP must be written atomically with the class change (see UpdateCharacterClassesRequest). */
    xp?: number
  },
): Promise<UpdateCharacterClassesResponse> {
  const classes = args.classes.filter(c => c.level > 0)
  if (classes.length === 0) {
    return new UpdateCharacterClassesResponse(args.correlationId, null, 'A character must have at least one class')
  }

  const newTotalLevel = totalLevel(classes)
  if (newTotalLevel > MAX_CHARACTER_LEVEL) {
    return new UpdateCharacterClassesResponse(
      args.correlationId, null,
      `Total character level cannot exceed ${MAX_CHARACTER_LEVEL}`,
    )
  }

  const slotResult = (await spellcastingEngine.evaluate(
    new CalculateSpellSlotsRequest(classes)
  )) as CalculateSpellSlotsResponse

  const maxHp = Math.max(1, args.maxHp)
  const currentHp = Math.min(Math.max(0, args.currentHp), maxHp)
  const derivedPrimaryClass = primaryClass(classes)

  const stored = await characterAccessor.store(
    new UpdateCharacterClassesRequest(
      args.characterId,
      classes,
      derivedPrimaryClass,
      newTotalLevel,
      maxHp,
      currentHp,
      slotResult.spellSlots,
      args.xp,
    )
  )

  if (!stored.success) {
    return new UpdateCharacterClassesResponse(
      args.correlationId, null,
      stored.errorMessage ?? 'Failed to update classes',
    )
  }

  return new UpdateCharacterClassesResponse(args.correlationId, {
    classes,
    totalLevel: newTotalLevel,
    primaryClass: derivedPrimaryClass,
    spellSlots: slotResult.spellSlots,
    maxHp,
    currentHp,
    multiclassCasterLevel: slotResult.multiclassCasterLevel,
  })
}
