import type { ClassLevel, SpellSlot, AbilityScores } from '@/types'
import { getCasterType, getSpellSlotsForLevel, type CasterType } from './spellSlots'

// ─────────────────────────────────────────────────────────────────────────────
// D&D 5e multiclassing reference data and rules maths.
//
// All tables below are SRD 5.1 values, cross-checked against the machine-
// readable `multi_classing` block of https://www.dnd5eapi.co/api/classes/<class>
// (the same API the level-up modal already queries for class features).
//
// This module is deliberately pure — no I/O, no Supabase, no React. The
// authoritative computation runs server-side through SpellcastingEngine; the
// client imports the same functions to render previews, exactly as
// `spellSlots.ts` is already shared between the two.
// ─────────────────────────────────────────────────────────────────────────────

export type AbilityKey = keyof AbilityScores

export const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

/**
 * Multiclass ability prerequisites (SRD "Multiclassing Prerequisites" table).
 *
 * `all` — every listed ability must be at least 13.
 * `any` — at least one of the listed abilities must be at least 13 (Fighter only).
 */
export interface MulticlassPrerequisite {
  all?: AbilityKey[]
  any?: AbilityKey[]
}

export interface ClassRules {
  hitDie: number
  prerequisite: MulticlassPrerequisite
  /** Proficiencies granted when this class is taken as a MULTICLASS (fewer than at 1st level). */
  multiclassProficiencies: string[]
}

export const CLASS_RULES: Record<string, ClassRules> = {
  barbarian: {
    hitDie: 12,
    prerequisite: { all: ['str'] },
    multiclassProficiencies: ['Shields', 'Simple weapons', 'Martial weapons'],
  },
  bard: {
    hitDie: 8,
    prerequisite: { all: ['cha'] },
    multiclassProficiencies: ['Light armor', 'One skill of your choice', 'One musical instrument of your choice'],
  },
  cleric: {
    hitDie: 8,
    prerequisite: { all: ['wis'] },
    multiclassProficiencies: ['Light armor', 'Medium armor', 'Shields'],
  },
  druid: {
    hitDie: 8,
    prerequisite: { all: ['wis'] },
    multiclassProficiencies: ['Light armor', 'Medium armor', 'Shields (druids will not wear metal armor or shields)'],
  },
  fighter: {
    hitDie: 10,
    prerequisite: { any: ['str', 'dex'] },
    multiclassProficiencies: ['Light armor', 'Medium armor', 'Shields', 'Simple weapons', 'Martial weapons'],
  },
  monk: {
    hitDie: 8,
    prerequisite: { all: ['dex', 'wis'] },
    multiclassProficiencies: ['Simple weapons', 'Shortswords'],
  },
  paladin: {
    hitDie: 10,
    prerequisite: { all: ['str', 'cha'] },
    multiclassProficiencies: ['Light armor', 'Medium armor', 'Shields', 'Simple weapons', 'Martial weapons'],
  },
  ranger: {
    hitDie: 10,
    prerequisite: { all: ['dex', 'wis'] },
    multiclassProficiencies: ['Light armor', 'Medium armor', 'Shields', 'Simple weapons', 'Martial weapons', 'One skill from the class skill list'],
  },
  rogue: {
    hitDie: 8,
    prerequisite: { all: ['dex'] },
    multiclassProficiencies: ['Light armor', "Thieves' tools", 'One skill from the class skill list'],
  },
  sorcerer: {
    hitDie: 6,
    prerequisite: { all: ['cha'] },
    multiclassProficiencies: ['None'],
  },
  warlock: {
    hitDie: 8,
    prerequisite: { all: ['cha'] },
    multiclassProficiencies: ['Light armor', 'Simple weapons'],
  },
  wizard: {
    hitDie: 6,
    prerequisite: { all: ['int'] },
    multiclassProficiencies: ['None'],
  },
}

/** Subclass names that turn a martial class into a third caster. */
const THIRD_CASTER_SUBCLASSES = ['eldritch knight', 'arcane trickster']

function normalize(name: string): string {
  return name.toLowerCase().trim()
}

export function getClassRules(className: string): ClassRules | null {
  const key = normalize(className)
  if (CLASS_RULES[key]) return CLASS_RULES[key]
  // "Fighter (Eldritch Knight)" and similar free-text entries still resolve.
  const match = Object.keys(CLASS_RULES).find(k => key.startsWith(k))
  return match ? CLASS_RULES[match] : null
}

/** Hit die for a class, defaulting to d8 for homebrew/unknown class names. */
export function getHitDie(className: string): number {
  return getClassRules(className)?.hitDie ?? 8
}

/**
 * Average HP gained per level for a hit die, as printed in each class entry
 * (the "take the average instead of rolling" option): d6→4, d8→5, d10→6, d12→7.
 */
export function hitDieAverage(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Caster type for one class entry, taking the subclass into account so that
 * Eldritch Knight / Arcane Trickster are recognised as third casters.
 */
export function getCasterTypeForEntry(entry: ClassLevel): CasterType {
  const haystack = `${normalize(entry.name)} ${normalize(entry.subclass ?? '')}`
  if (THIRD_CASTER_SUBCLASSES.some(s => haystack.includes(s))) return 'third'
  return getCasterType(entry.name)
}

// ── Prerequisites ────────────────────────────────────────────────────────────

export interface PrerequisiteCheck {
  className: string
  met: boolean
  /** Human-readable requirement, e.g. "Strength 13 and Charisma 13". */
  requirement: string
  /** Abilities that fall short, with the score the character actually has. */
  shortfalls: { ability: AbilityKey; required: number; actual: number }[]
}

export function describePrerequisite(prereq: MulticlassPrerequisite): string {
  if (prereq.any) return prereq.any.map(a => `${ABILITY_LABELS[a]} 13`).join(' or ')
  if (prereq.all) return prereq.all.map(a => `${ABILITY_LABELS[a]} 13`).join(' and ')
  return 'None'
}

/**
 * Checks one class's multiclass ability prerequisite.
 *
 * Returns `met: true` when ability scores are unknown — this app does not
 * require ability scores to be filled in, and the multiclass UI is advisory
 * rather than a rules-enforcement wall, so an unknown score must not read as
 * a failure.
 */
export function checkPrerequisite(className: string, scores: AbilityScores | null): PrerequisiteCheck {
  const rules = getClassRules(className)
  if (!rules) {
    return { className, met: true, requirement: 'Unknown class — no prerequisite on file', shortfalls: [] }
  }
  const requirement = describePrerequisite(rules.prerequisite)
  if (!scores) return { className, met: true, requirement, shortfalls: [] }

  const shortfalls: PrerequisiteCheck['shortfalls'] = []
  if (rules.prerequisite.all) {
    for (const ability of rules.prerequisite.all) {
      if (scores[ability] < 13) shortfalls.push({ ability, required: 13, actual: scores[ability] })
    }
    return { className, met: shortfalls.length === 0, requirement, shortfalls }
  }
  if (rules.prerequisite.any) {
    const satisfied = rules.prerequisite.any.some(ability => scores[ability] >= 13)
    if (!satisfied) {
      for (const ability of rules.prerequisite.any) {
        shortfalls.push({ ability, required: 13, actual: scores[ability] })
      }
    }
    return { className, met: satisfied, requirement, shortfalls }
  }
  return { className, met: true, requirement, shortfalls: [] }
}

/**
 * Full multiclass legality check: to take a level in a new class you must meet
 * the prerequisite for the class you are LEAVING as well as the one you are
 * ENTERING. Only classes the character already has levels in count as "leaving".
 */
export function checkMulticlassEntry(
  existing: ClassLevel[],
  newClassName: string,
  scores: AbilityScores | null,
): { entering: PrerequisiteCheck; leaving: PrerequisiteCheck[]; allMet: boolean } {
  const entering = checkPrerequisite(newClassName, scores)
  const leaving = existing
    .filter(e => normalize(e.name) !== normalize(newClassName))
    .map(e => checkPrerequisite(e.name, scores))
  return {
    entering,
    leaving,
    allMet: entering.met && leaving.every(l => l.met),
  }
}

// ── Spell slots ──────────────────────────────────────────────────────────────

/**
 * Contribution of a single class entry to the combined multiclass caster level
 * (SRD): full casters count their whole level, Paladin/Ranger count half
 * ROUNDED DOWN, Eldritch Knight/Arcane Trickster count a third ROUNDED DOWN,
 * and Warlock contributes nothing (Pact Magic is not the Spellcasting feature).
 */
export function casterLevelContribution(entry: ClassLevel): number {
  switch (getCasterTypeForEntry(entry)) {
    case 'full':  return entry.level
    case 'half':  return Math.floor(entry.level / 2)
    case 'third': return Math.floor(entry.level / 3)
    default:      return 0
  }
}

export interface SpellcastingBreakdown {
  /** Shared (long-rest) slots from the Spellcasting feature. */
  spellSlots: SpellSlot[]
  /** Warlock Pact Magic slots — separate pool, recharges on a short rest. */
  pactSlots: SpellSlot[]
  /** Combined caster level used against the Multiclass Spellcaster table, or null when not applicable. */
  multiclassCasterLevel: number | null
  /** Total warlock levels driving the Pact Magic table. */
  warlockLevel: number
  /** How the shared slots were derived — useful for explaining the result in the UI. */
  method: 'none' | 'single-class' | 'multiclass-table'
  /** Class entries that grant the Spellcasting feature (Warlock excluded). */
  spellcastingClasses: ClassLevel[]
}

/**
 * The Multiclass Spellcaster: Spell Slots per Spell Level table is identical to
 * the standard full-caster progression, so it is looked up through the existing
 * FULL_CASTER table via a synthetic "wizard" of the combined caster level rather
 * than duplicating twenty rows of numbers that would then have to be kept in sync.
 * Verified against SRD rows 5 (4/3/2), 12 (4/3/3/3/2/1) and 20 (4/3/3/3/3/2/2/1/1).
 */
function multiclassTable(casterLevel: number): SpellSlot[] {
  if (casterLevel < 1) return []
  return getSpellSlotsForLevel('wizard', casterLevel)
}

/**
 * Computes every spell slot a character has from their class line-up.
 *
 * The branch that matters most: the Multiclass Spellcaster table is only used
 * "once you have the Spellcasting feature from more than one class". A character
 * with exactly ONE spellcasting class still uses that class's own table at its
 * own class level — so a Paladin 5 / Fighter 5 keeps the Paladin's 4×1st and
 * 2×2nd slots rather than being reduced to combined caster level 2. Getting this
 * wrong is the single most common multiclass spell slot bug.
 */
export function calculateSpellcasting(classes: ClassLevel[]): SpellcastingBreakdown {
  const warlockLevel = classes
    .filter(c => getCasterTypeForEntry(c) === 'warlock')
    .reduce((sum, c) => sum + c.level, 0)

  const pactSlots: SpellSlot[] = warlockLevel > 0
    ? getSpellSlotsForLevel('warlock', warlockLevel).map(s => ({ ...s, kind: 'pact' as const }))
    : []

  // Classes with the Spellcasting feature. Warlock is excluded on purpose —
  // Pact Magic is a separate feature and never feeds the multiclass table.
  const spellcastingClasses = classes.filter(c => {
    const type = getCasterTypeForEntry(c)
    return type === 'full' || type === 'half' || type === 'third'
  })

  if (spellcastingClasses.length === 0) {
    return {
      spellSlots: [], pactSlots, multiclassCasterLevel: null,
      warlockLevel, method: 'none', spellcastingClasses,
    }
  }

  if (spellcastingClasses.length === 1) {
    const only = spellcastingClasses[0]
    const type = getCasterTypeForEntry(only)
    // Third casters have no table of their own in `spellSlots.ts`; their
    // progression is the full-caster table read at ceil(level / 3).
    const slots = type === 'third'
      ? multiclassTable(Math.ceil(only.level / 3))
      : getSpellSlotsForLevel(only.name, only.level)
    return {
      spellSlots: slots, pactSlots, multiclassCasterLevel: null,
      warlockLevel, method: 'single-class', spellcastingClasses,
    }
  }

  const casterLevel = spellcastingClasses.reduce((sum, c) => sum + casterLevelContribution(c), 0)
  return {
    spellSlots: multiclassTable(casterLevel),
    pactSlots,
    multiclassCasterLevel: casterLevel,
    warlockLevel,
    method: 'multiclass-table',
    spellcastingClasses,
  }
}

/** Shared + pact slots as one array, ready to persist to `characters.spell_slots`. */
export function calculateAllSpellSlots(classes: ClassLevel[]): SpellSlot[] {
  const { spellSlots, pactSlots } = calculateSpellcasting(classes)
  return [...spellSlots, ...pactSlots]
}

// ── Class list helpers ───────────────────────────────────────────────────────

/** Total character level = the sum of every class level. */
export function totalLevel(classes: ClassLevel[]): number {
  return classes.reduce((sum, c) => sum + c.level, 0)
}

/** Display form, e.g. "Fighter 5 / Wizard 3". */
export function formatClassLine(classes: ClassLevel[]): string {
  return classes.map(c => `${c.name} ${c.level}`).join(' / ')
}

/** The primary class — the first entry, i.e. the class the character started in. */
export function primaryClass(classes: ClassLevel[]): string {
  return classes[0]?.name ?? ''
}

/**
 * Normalises whatever is on a character row into a usable class list.
 *
 * Rows written before the multiclass migration (and any created by a code path
 * that only sets the scalar `class`/`level` columns) come back with an empty
 * array, so fall back to the single-class pair rather than returning nothing.
 */
export function resolveClasses(
  classes: ClassLevel[] | null | undefined,
  fallbackClass: string,
  fallbackLevel: number,
): ClassLevel[] {
  if (classes && classes.length > 0) return classes
  return [{ name: fallbackClass, level: fallbackLevel, subclass: null }]
}

/** Adds levels to an existing class, or appends a new class entry. */
export function addClassLevel(classes: ClassLevel[], className: string, levelsToAdd = 1): ClassLevel[] {
  const key = normalize(className)
  const index = classes.findIndex(c => normalize(c.name) === key)
  if (index === -1) {
    return [...classes, { name: className, level: levelsToAdd, subclass: null }]
  }
  return classes.map((c, i) => (i === index ? { ...c, level: c.level + levelsToAdd } : c))
}
