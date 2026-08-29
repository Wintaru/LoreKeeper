'use client'

import React, { useMemo, useState } from 'react'
import type { Character, ClassLevel, SpellSlot } from '@/types'
import { ALL_CLASSES } from '@/data/spellSlots'
import { xpToLevel, proficiencyBonusForLevel, MAX_CHARACTER_LEVEL } from '@/data/leveling'
import {
  resolveClasses,
  totalLevel,
  formatClassLine,
  addClassLevel,
  calculateSpellcasting,
  checkMulticlassEntry,
  getClassRules,
  getHitDie,
  hitDieAverage,
  abilityModifier,
  ABILITY_LABELS,
  type PrerequisiteCheck,
} from '@/data/multiclass'

/** Snapshot taken before a level-up so it can be undone in one click. */
interface ClassSnapshot {
  classes: ClassLevel[]
  maxHp: number
  currentHp: number
  label: string
}

export function MulticlassPanel({
  character: c,
  dmPin,
  onRefresh,
}: {
  character: Character
  dmPin: string | undefined
  onRefresh: () => void
}) {
  const classes = useMemo(() => resolveClasses(c.classes, c.class, c.level), [c.classes, c.class, c.level])
  const currentTotal = totalLevel(classes)

  const [open, setOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.name ?? '')
  const [subclassInput, setSubclassInput] = useState('')
  const [hpGainInput, setHpGainInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [undoSnapshot, setUndoSnapshot] = useState<ClassSnapshot | null>(null)

  // A level is "available" when XP has bought more total levels than the class
  // line-up currently accounts for. XP no longer moves the level number on its
  // own — the DM assigns each level to a class here.
  const earnedLevel = xpToLevel(c.xp)
  const pendingLevels = earnedLevel - currentTotal

  const isNewClass = !classes.some(e => e.name.toLowerCase().trim() === selectedClass.toLowerCase().trim())
  const conMod = c.abilityScores ? abilityModifier(c.abilityScores.con) : 0
  const suggestedHp = Math.max(1, hitDieAverage(getHitDie(selectedClass)) + conMod)
  const hpGain = hpGainInput === '' ? suggestedHp : (parseInt(hpGainInput, 10) || 0)

  const prereq = useMemo(
    () => checkMulticlassEntry(classes, selectedClass, c.abilityScores),
    [classes, selectedClass, c.abilityScores],
  )

  const projectedClasses = useMemo(() => {
    const leveled = addClassLevel(classes, selectedClass, 1)
    if (!subclassInput.trim()) return leveled
    const key = selectedClass.toLowerCase().trim()
    return leveled.map(entry =>
      entry.name.toLowerCase().trim() === key ? { ...entry, subclass: subclassInput.trim() } : entry
    )
  }, [classes, selectedClass, subclassInput])
  const currentCasting = useMemo(() => calculateSpellcasting(classes), [classes])
  const projectedCasting = useMemo(() => calculateSpellcasting(projectedClasses), [projectedClasses])

  const atLevelCap = currentTotal >= MAX_CHARACTER_LEVEL
  const rules = getClassRules(selectedClass)

  async function handleLevelUp() {
    if (!selectedClass.trim() || busy || atLevelCap) return
    setBusy(true); setError(null)
    const snapshot: ClassSnapshot = {
      classes, maxHp: c.maxHp, currentHp: c.currentHp,
      label: formatClassLine(classes),
    }
    const res = await fetch('/api/characters/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: c.id, className: selectedClass, hpGain,
        subclass: subclassInput.trim() || null,
        dmPin,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null)
      setError(readError(body) ?? 'Level up failed')
      return
    }
    setUndoSnapshot(snapshot)
    setHpGainInput('')
    setSubclassInput('')
    onRefresh()
  }

  async function handleUndo() {
    if (!undoSnapshot || busy) return
    setBusy(true); setError(null)
    const res = await fetch('/api/characters/classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        characterId: c.id,
        classes: undoSnapshot.classes,
        maxHp: undoSnapshot.maxHp,
        currentHp: undoSnapshot.currentHp,
        dmPin,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      const body: unknown = await res.json().catch(() => null)
      setError(readError(body) ?? 'Undo failed')
      return
    }
    setUndoSnapshot(null)
    onRefresh()
  }

  // Case-insensitive merge: a class already on the sheet must not appear a
  // second time just because it was stored with different casing than its
  // ALL_CLASSES entry (e.g. a character created with "fighter").
  const classOptions = (() => {
    const seen = new Set<string>()
    const options: string[] = []
    for (const name of [...classes.map(e => e.name), ...ALL_CLASSES]) {
      const key = name.toLowerCase().trim()
      if (seen.has(key)) continue
      seen.add(key)
      options.push(name)
    }
    return options
  })()

  // Only Fighter and Rogue have a third-caster subclass (Eldritch Knight,
  // Arcane Trickster) — offering the field for every class would just invite
  // typos that silently do nothing.
  const canPickThirdCasterSubclass = ['fighter', 'rogue'].includes(selectedClass.toLowerCase().trim())

  return (
    <div className="border-t border-stone-800/50 pt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setOpen(v => !v)}
          className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
        >
          {open ? 'Hide classes' : 'Classes & level up'}
        </button>
        <div className="flex items-center gap-1.5">
          {pendingLevels > 0 && (
            <span className="text-[0.65rem] px-2 py-0.5 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 font-medium">
              {pendingLevels === 1 ? 'Level up available' : `${pendingLevels} levels available`}
            </span>
          )}
          {pendingLevels < 0 && (
            <span
              title={`Class levels total ${currentTotal}, but ${c.xp.toLocaleString()} XP only earns level ${earnedLevel}.`}
              className="text-[0.65rem] px-2 py-0.5 rounded-full bg-amber-950/50 border border-amber-800/50 text-amber-400 font-medium"
            >
              XP below level {currentTotal}
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-3 pt-1">
          {/* Current line-up */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-stone-200">{formatClassLine(classes)}</span>
              <span className="text-xs text-stone-500 shrink-0">Level {currentTotal}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[0.65rem]">
              <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400">
                Proficiency +{proficiencyBonusForLevel(currentTotal)}
              </span>
              <CastingBadge casting={currentCasting} />
            </div>
          </div>

          {/* Level up form */}
          {atLevelCap ? (
            <p className="text-xs text-stone-500">Character is at the level {MAX_CHARACTER_LEVEL} cap.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 uppercase tracking-wider">Take a level in</p>
              <div className="flex gap-2">
                <select
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); setHpGainInput(''); setSubclassInput('') }}
                  className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                >
                  {classOptions.map(name => {
                    const existing = classes.find(e => e.name.toLowerCase().trim() === name.toLowerCase().trim())
                    return (
                      <option key={name} value={name}>
                        {name}{existing ? ` ${existing.level} → ${existing.level + 1}` : ' (new class)'}
                      </option>
                    )
                  })}
                </select>
                <div className="w-24 shrink-0">
                  <input
                    type="number"
                    value={hpGainInput}
                    placeholder={`+${suggestedHp} HP`}
                    onChange={e => setHpGainInput(e.target.value)}
                    title={`Hit die average for ${selectedClass} (d${getHitDie(selectedClass)}) is ${hitDieAverage(getHitDie(selectedClass))}${conMod !== 0 ? `, CON modifier ${conMod >= 0 ? '+' : ''}${conMod}` : ''}`}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
              <p className="text-[0.65rem] text-stone-600">
                d{getHitDie(selectedClass)} hit die · average {hitDieAverage(getHitDie(selectedClass))}
                {c.abilityScores
                  ? ` ${conMod >= 0 ? '+' : '−'} ${Math.abs(conMod)} CON = +${suggestedHp} HP`
                  : ' (no CON score on file — add ability scores for an exact figure)'}
              </p>

              {canPickThirdCasterSubclass && (
                <div>
                  <label className="text-[0.65rem] text-stone-600">
                    Subclass (set to &quot;Eldritch Knight&quot; or &quot;Arcane Trickster&quot; for bonus spell slots)
                  </label>
                  <input
                    type="text"
                    value={subclassInput}
                    onChange={e => setSubclassInput(e.target.value)}
                    placeholder="Optional"
                    className="mt-1 w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              {/* Prerequisites — advisory, never blocking */}
              {isNewClass && (
                <PrerequisiteNotice entering={prereq.entering} leaving={prereq.leaving} allMet={prereq.allMet} />
              )}

              {/* Multiclass proficiencies reference */}
              {isNewClass && rules && (
                <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5">
                  <p className="text-[0.65rem] text-stone-500 uppercase tracking-wider mb-1">
                    Proficiencies gained (multiclass)
                  </p>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {rules.multiclassProficiencies.join(' · ')}
                  </p>
                  <p className="text-[0.65rem] text-stone-600 mt-1.5 leading-relaxed">
                    Multiclassing grants fewer proficiencies than starting in the class — notably no saving throw
                    proficiencies, and none of its starting equipment.
                  </p>
                </div>
              )}

              {/* Spell slot preview */}
              <SlotPreview
                label={`After: ${formatClassLine(projectedClasses)}`}
                casting={projectedCasting}
                previous={currentCasting.spellSlots.concat(currentCasting.pactSlots)}
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => void handleLevelUp()}
                  disabled={busy}
                  className="flex-1 bg-violet-800 hover:bg-violet-700 disabled:opacity-50 text-violet-100 text-xs font-medium py-1.5 rounded-lg transition-colors"
                >
                  {busy ? 'Applying…' : `Level up · ${selectedClass}`}
                </button>
                {undoSnapshot && (
                  <button
                    onClick={() => void handleUndo()}
                    disabled={busy}
                    title={`Restore ${undoSnapshot.label}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 disabled:opacity-50 transition-colors"
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PrerequisiteNotice({
  entering, leaving, allMet,
}: {
  entering: PrerequisiteCheck
  leaving: PrerequisiteCheck[]
  allMet: boolean
}) {
  const failed = [entering, ...leaving].filter(p => !p.met)
  if (allMet) {
    return (
      <p className="text-[0.65rem] text-emerald-500/80">
        ✓ Meets multiclass prerequisites ({entering.className}: {entering.requirement})
      </p>
    )
  }
  return (
    <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-2.5 space-y-1">
      <p className="text-[0.65rem] text-amber-400 uppercase tracking-wider">Prerequisite not met</p>
      {failed.map(p => (
        <p key={p.className} className="text-xs text-amber-200/90 leading-relaxed">
          <span className="font-medium capitalize">{p.className}</span> requires {p.requirement}
          {p.shortfalls.length > 0 && (
            <span className="text-amber-200/60">
              {' '}— has {p.shortfalls.map(s => `${ABILITY_LABELS[s.ability]} ${s.actual}`).join(', ')}
            </span>
          )}
        </p>
      ))}
      <p className="text-[0.65rem] text-stone-500 pt-0.5">
        You must meet the requirement for the class you are leaving as well as the one you are entering.
        This is a warning only — you can still apply the level.
      </p>
    </div>
  )
}

function CastingBadge({ casting }: { casting: ReturnType<typeof calculateSpellcasting> }) {
  return (
    <>
      {casting.multiclassCasterLevel !== null && (
        <span
          title="Combined caster level: full casters count their full level, Paladin/Ranger count half rounded down, Eldritch Knight/Arcane Trickster count a third rounded down."
          className="px-2 py-0.5 rounded-full bg-violet-950/50 border border-violet-900/50 text-violet-300"
        >
          Caster level {casting.multiclassCasterLevel}
        </span>
      )}
      {casting.warlockLevel > 0 && (
        <span
          title="Pact Magic is a separate pool from the multiclass spell slot table and recharges on a short rest."
          className="px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/40 text-amber-400"
        >
          Pact Magic {casting.warlockLevel}
        </span>
      )}
    </>
  )
}

function SlotPreview({
  label, casting, previous,
}: {
  label: string
  casting: ReturnType<typeof calculateSpellcasting>
  previous: SpellSlot[]
}) {
  const all = [...casting.spellSlots, ...casting.pactSlots]
  if (all.length === 0 && previous.length === 0) return null

  return (
    <div className="bg-stone-950/60 border border-stone-800 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.65rem] text-stone-500 uppercase tracking-wider truncate">{label}</p>
        <div className="flex gap-1 shrink-0"><CastingBadge casting={casting} /></div>
      </div>
      {all.length === 0 ? (
        <p className="text-xs text-stone-600">No spell slots.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {all.map(slot => {
            const before = previous.find(p => p.level === slot.level && (p.kind ?? 'spell') === (slot.kind ?? 'spell'))
            const changed = (before?.total ?? 0) !== slot.total
            const isPact = slot.kind === 'pact'
            return (
              <span
                key={`${slot.kind ?? 'spell'}-${slot.level}`}
                title={isPact ? 'Pact Magic slot (short rest)' : 'Spellcasting slot (long rest)'}
                className={`text-[0.65rem] font-mono px-1.5 py-0.5 rounded border ${
                  isPact
                    ? 'bg-amber-950/40 border-amber-900/50 text-amber-300'
                    : changed
                      ? 'bg-violet-900/50 border-violet-700/60 text-violet-200'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                }`}
              >
                L{slot.level}×{slot.total}{changed && !isPact ? ` (${before?.total ?? 0})` : ''}
              </span>
            )
          })}
        </div>
      )}
      {casting.method === 'single-class' && casting.spellcastingClasses.length === 1 && (
        <p className="text-[0.65rem] text-stone-600 leading-relaxed">
          Only one class has the Spellcasting feature, so slots come from the {casting.spellcastingClasses[0].name} table
          at its own class level — not the multiclass table.
        </p>
      )}
    </div>
  )
}

function readError(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const v = body as Record<string, unknown>
  return typeof v.error === 'string' ? v.error : null
}
