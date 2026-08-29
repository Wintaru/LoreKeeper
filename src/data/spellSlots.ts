import type { SpellSlot } from '@/types'

// 'third' covers Eldritch Knight / Arcane Trickster. It is never returned by
// `getCasterType`, which only sees a base class name — resolving it needs the
// subclass too, so use `getCasterTypeForEntry` in `multiclass.ts` for that.
export type CasterType = 'full' | 'half' | 'third' | 'warlock' | 'none'

// Indices are spell slot levels 1–9 (0-indexed array: index 0 = 1st-level slots)
const FULL_CASTER: Record<number, number[]> = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1],
}

const HALF_CASTER: Record<number, number[]> = {
  1:  [0,0,0,0,0],
  2:  [2,0,0,0,0],
  3:  [3,0,0,0,0],
  4:  [3,0,0,0,0],
  5:  [4,2,0,0,0],
  6:  [4,2,0,0,0],
  7:  [4,3,0,0,0],
  8:  [4,3,0,0,0],
  9:  [4,3,2,0,0],
  10: [4,3,2,0,0],
  11: [4,3,3,0,0],
  12: [4,3,3,0,0],
  13: [4,3,3,1,0],
  14: [4,3,3,1,0],
  15: [4,3,3,2,0],
  16: [4,3,3,2,0],
  17: [4,3,3,3,1],
  18: [4,3,3,3,1],
  19: [4,3,3,3,2],
  20: [4,3,3,3,2],
}

// Warlock pact magic — only ever has one slot level at a time
const WARLOCK: Record<number, { slotLevel: number; count: number }> = {
  1:  { slotLevel: 1, count: 1 },
  2:  { slotLevel: 1, count: 2 },
  3:  { slotLevel: 2, count: 2 },
  4:  { slotLevel: 2, count: 2 },
  5:  { slotLevel: 3, count: 2 },
  6:  { slotLevel: 3, count: 2 },
  7:  { slotLevel: 4, count: 2 },
  8:  { slotLevel: 4, count: 2 },
  9:  { slotLevel: 5, count: 2 },
  10: { slotLevel: 5, count: 2 },
  11: { slotLevel: 5, count: 3 },
  12: { slotLevel: 5, count: 3 },
  13: { slotLevel: 5, count: 3 },
  14: { slotLevel: 5, count: 3 },
  15: { slotLevel: 5, count: 3 },
  16: { slotLevel: 5, count: 3 },
  17: { slotLevel: 5, count: 4 },
  18: { slotLevel: 5, count: 4 },
  19: { slotLevel: 5, count: 4 },
  20: { slotLevel: 5, count: 4 },
}

const CLASS_CASTER_TYPE: Record<string, CasterType> = {
  bard:      'full',
  cleric:    'full',
  druid:     'full',
  sorcerer:  'full',
  wizard:    'full',
  paladin:   'half',
  ranger:    'half',
  warlock:   'warlock',
  barbarian: 'none',
  fighter:   'none',
  monk:      'none',
  rogue:     'none',
}

// Standard SRD class indices for the D&D 5e API
const KNOWN_CLASS_INDICES = [
  'barbarian', 'bard', 'cleric', 'druid',
  'fighter', 'monk', 'paladin', 'ranger',
  'rogue', 'sorcerer', 'warlock', 'wizard',
]

export function getCasterType(className: string): CasterType {
  const lower = className.toLowerCase().trim()
  if (!lower) return 'none'
  if (CLASS_CASTER_TYPE[lower]) return CLASS_CASTER_TYPE[lower]
  // Fuzzy prefix match so free-text entries like "Fighter (Eldritch Knight)"
  // still resolve to their base class. The empty-string guard above matters:
  // without it every key "startsWith" '' and the first key would always win.
  const match = Object.keys(CLASS_CASTER_TYPE).find(k => lower.startsWith(k) || k.startsWith(lower))
  return match ? CLASS_CASTER_TYPE[match]! : 'none'
}

export function getApiClassIndex(className: string): string | null {
  const lower = className.toLowerCase().trim()
  if (!lower) return null
  return (
    KNOWN_CLASS_INDICES.find(c => c === lower) ??
    KNOWN_CLASS_INDICES.find(c => lower.startsWith(c) || c.startsWith(lower)) ??
    null
  )
}

export function getSpellSlotsForLevel(className: string, level: number): SpellSlot[] {
  const casterType = getCasterType(className)
  const l = Math.max(1, Math.min(20, level))

  if (casterType === 'warlock') {
    const w = WARLOCK[l]!
    return [{ level: w.slotLevel, total: w.count, used: 0 }]
  }

  const table = casterType === 'full' ? FULL_CASTER : casterType === 'half' ? HALF_CASTER : null
  if (!table) return []

  return (table[l] ?? [])
    .map((count, i) => ({ level: i + 1, total: count, used: 0 }))
    .filter(s => s.total > 0)
}

/** Two slot entries are the same pool only if their level AND pool kind match. */
function sameSlotPool(a: SpellSlot, b: SpellSlot): boolean {
  return a.level === b.level && (a.kind ?? 'spell') === (b.kind ?? 'spell')
}

// Merges new slot totals onto existing slots, preserving used counts where
// possible. Pact Magic slots are matched separately from Spellcasting slots, so
// a warlock/wizard's 2nd-level pact slots never absorb the used count of their
// 2nd-level shared slots (or vice versa).
export function mergeSpellSlots(existing: SpellSlot[], newSlots: SpellSlot[]): SpellSlot[] {
  return newSlots.map(ns => {
    const old = existing.find(e => sameSlotPool(e, ns))
    return { ...ns, used: old ? Math.min(old.used, ns.total) : 0 }
  })
}

// Returns spell slot levels that are newly available at newLevel but weren't at oldLevel
export function getNewlyUnlockedSlotLevels(className: string, oldLevel: number, newLevel: number): number[] {
  const oldLevelSet = new Set(getSpellSlotsForLevel(className, oldLevel).map(s => s.level))
  return getSpellSlotsForLevel(className, newLevel)
    .filter(s => !oldLevelSet.has(s.level))
    .map(s => s.level)
}

export const CASTER_CLASSES = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']
export const ALL_CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
