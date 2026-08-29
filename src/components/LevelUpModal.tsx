'use client'

import React, { useEffect, useState } from 'react'
import type { SpellSlot, ClassLevel } from '@/types'
import { getApiClassIndex, mergeSpellSlots } from '@/data/spellSlots'
import {
  calculateSpellcasting,
  formatClassLine,
  totalLevel,
} from '@/data/multiclass'
import { proficiencyBonusForLevel } from '@/data/leveling'

type ApiFeature = { index: string; name: string }
type FeatureDetail = { name: string; desc: string[] }

const SLOT_LEVEL_COLORS: Record<number, string> = {
  1: 'bg-sky-900/60 text-sky-300 border-sky-800/50',
  2: 'bg-emerald-900/60 text-emerald-300 border-emerald-800/50',
  3: 'bg-violet-900/60 text-violet-300 border-violet-800/50',
  4: 'bg-amber-900/60 text-amber-300 border-amber-800/50',
  5: 'bg-red-900/60 text-red-300 border-red-800/50',
  6: 'bg-orange-900/60 text-orange-300 border-orange-800/50',
  7: 'bg-pink-900/60 text-pink-300 border-pink-800/50',
  8: 'bg-cyan-900/60 text-cyan-300 border-cyan-800/50',
  9: 'bg-rose-900/60 text-rose-300 border-rose-800/50',
}

export function LevelUpModal({
  characterName,
  classes,
  previousClasses,
  newLevel,
  currentSpellSlots,
  onClose,
  onApplySpellSlots,
  onBrowseSpells,
}: {
  characterName: string
  /** The character's class line-up AFTER the level. */
  classes: ClassLevel[]
  /** The line-up BEFORE it, used to work out which class gained the level. */
  previousClasses: ClassLevel[]
  newLevel: number
  currentSpellSlots: SpellSlot[]
  onClose: () => void
  onApplySpellSlots: (slots: SpellSlot[]) => Promise<void>
  onBrowseSpells: () => void
}) {
  const [features, setFeatures] = useState<ApiFeature[]>([])
  const [featureDetails, setFeatureDetails] = useState<Record<string, FeatureDetail>>({})
  const [loadingFeatures, setLoadingFeatures] = useState(true)
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  // Work out which class took the level so the features panel and the
  // "Browse spells" link point at the right class, not just the primary one.
  const levelledClass = findLevelledClass(previousClasses, classes)
  const classLevel = classes.find(c => c.name === levelledClass)?.level ?? newLevel

  const casting = calculateSpellcasting(classes)
  const previousCasting = calculateSpellcasting(previousClasses)

  const classIndex = getApiClassIndex(levelledClass)
  const newSlots = [...casting.spellSlots, ...casting.pactSlots]
  const mergedSlots = mergeSpellSlots(currentSpellSlots, newSlots)

  const previousLevels = new Set(
    [...previousCasting.spellSlots, ...previousCasting.pactSlots]
      .map(s => `${s.kind ?? 'spell'}-${s.level}`)
  )
  const newlyUnlocked = newSlots
    .filter(s => !previousLevels.has(`${s.kind ?? 'spell'}-${s.level}`))
    .map(s => s.level)

  const isCaster = newSlots.length > 0
  const isMulticlass = classes.length > 1

  useEffect(() => {
    if (!classIndex) { setLoadingFeatures(false); return }
    fetch(`https://www.dnd5eapi.co/api/classes/${classIndex}/levels/${classLevel}`)
      .then(r => r.json())
      .then((data: unknown) => {
        if (isLevelData(data)) setFeatures(data.features)
      })
      .catch(() => {})
      .finally(() => setLoadingFeatures(false))
  }, [classIndex, classLevel])

  const fetchFeatureDetail = async (index: string) => {
    if (featureDetails[index]) return
    try {
      const res = await fetch(`https://www.dnd5eapi.co/api/features/${index}`)
      const data: unknown = await res.json()
      if (isFeatureDetail(data)) setFeatureDetails(prev => ({ ...prev, [index]: data }))
    } catch { /* silently ignore */ }
  }

  const handleFeatureToggle = (index: string) => {
    const next = expandedFeature === index ? null : index
    setExpandedFeature(next)
    if (next) void fetchFeatureDetail(next)
  }

  const handleApplySlots = async () => {
    setApplying(true)
    await onApplySpellSlots(mergedSlots)
    setApplying(false)
    setApplied(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 pt-10 pb-28 space-y-6">

          {/* Header */}
          <div className="text-center space-y-2">
            <p className="text-violet-400 text-xs uppercase tracking-[0.3em] font-medium">Level Up!</p>
            <p className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-violet-300 to-violet-600 leading-none py-1">{newLevel}</p>
            <p className="text-stone-300 text-sm">{characterName} · {formatClassLine(classes)}</p>
            <p className="text-stone-500 text-xs">
              Level in {levelledClass}: {classLevel} · Proficiency +{proficiencyBonusForLevel(totalLevel(classes))}
            </p>
            {isMulticlass && casting.multiclassCasterLevel !== null && (
              <p className="text-violet-400/80 text-xs">
                Combined caster level {casting.multiclassCasterLevel}
              </p>
            )}
          </div>

          {/* Class Features */}
          <div className="space-y-2">
            <p className="text-xs text-stone-500 uppercase tracking-widest">Features Gained</p>
            {loadingFeatures && (
              <p className="text-stone-600 text-sm py-2">Loading class features…</p>
            )}
            {!loadingFeatures && features.length === 0 && (
              <p className="text-stone-600 text-sm py-2">
                {classIndex ? 'No new features at this level.' : 'Class not found in SRD — check the Rulebook tab for your class features.'}
              </p>
            )}
            {features.map(f => (
              <div key={f.index} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => handleFeatureToggle(f.index)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-stone-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-stone-100">{f.name}</span>
                  <span className={`text-stone-500 text-xs transition-transform duration-200 inline-block shrink-0 ${expandedFeature === f.index ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {expandedFeature === f.index && (
                  <div className="px-4 pb-4 border-t border-stone-800 pt-3">
                    {!featureDetails[f.index] && <p className="text-stone-500 text-xs">Loading…</p>}
                    {featureDetails[f.index] && (
                      <div className="space-y-1.5">
                        {featureDetails[f.index].desc.map((para, i) => (
                          <p key={i} className="text-stone-300 text-xs leading-relaxed">{para}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Spell Slots section */}
          {isCaster && (
            <div className="bg-stone-900 border border-violet-900/50 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-500 uppercase tracking-widest">Spell Slots</p>
                {casting.pactSlots.length > 0 && (
                  <span className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 rounded-full">+ Pact Magic</span>
                )}
              </div>

              {newlyUnlocked.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newlyUnlocked.map(l => (
                    <span key={l} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${SLOT_LEVEL_COLORS[l] ?? 'bg-stone-700 text-stone-300 border-stone-600'}`}>
                      ✦ Level {l} unlocked
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {mergedSlots.map(slot => {
                  const kind = slot.kind ?? 'spell'
                  const isPact = kind === 'pact'
                  const isNew = !previousLevels.has(`${kind}-${slot.level}`)
                  const oldSlot = currentSpellSlots.find(s => s.level === slot.level && (s.kind ?? 'spell') === kind)
                  const increased = oldSlot && slot.total > oldSlot.total
                  return (
                    <div key={`${kind}-${slot.level}`} className={`flex items-center gap-3 rounded-lg px-2 py-1 ${isNew ? 'bg-violet-950/30' : ''}`}>
                      <span className={`text-xs w-10 shrink-0 ${isPact ? 'text-amber-500' : 'text-stone-500'}`}>Lvl {slot.level}</span>
                      <div className="flex gap-1 flex-wrap flex-1">
                        {Array.from({ length: slot.total }).map((_, i) => (
                          <div key={i} className={`w-5 h-5 rounded-full border-2 ${
                            isPact
                              ? 'border-amber-500 bg-amber-900/50'
                              : isNew || (increased && i >= (oldSlot?.total ?? 0))
                                ? 'border-violet-400 bg-violet-800/60'
                                : 'border-violet-600 bg-violet-900/40'
                          }`} />
                        ))}
                      </div>
                      <span className="text-xs tabular-nums shrink-0">
                        {isNew
                          ? <span className="text-violet-400 font-medium">NEW</span>
                          : increased
                            ? <span className="text-violet-400">{slot.total} <span className="text-stone-600">(was {oldSlot?.total})</span></span>
                            : <span className="text-stone-500">{slot.total}</span>
                        }
                      </span>
                    </div>
                  )
                })}
              </div>

              {!applied ? (
                <button
                  onClick={() => void handleApplySlots()}
                  disabled={applying}
                  className="w-full py-2.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  {applying ? 'Applying…' : 'Apply Updated Spell Slots'}
                </button>
              ) : (
                <div className="text-center text-xs text-emerald-400 py-1">✓ Spell slots updated</div>
              )}
            </div>
          )}

          {/* Browse class spells */}
          {classIndex && (
            <button
              onClick={() => { onBrowseSpells(); onClose() }}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-xl text-sm text-stone-300 transition-colors flex items-center justify-center gap-2"
            >
              <span>Browse {levelledClass} Spells</span>
              <span className="text-stone-500">→</span>
            </button>
          )}

        </div>
      </div>

      {/* Sticky dismiss */}
      <div className="shrink-0 px-4 pb-8 pt-3 border-t border-stone-800 bg-stone-950">
        <div className="max-w-sm mx-auto">
          <button
            onClick={onClose}
            className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/** The class whose level changed between the two line-ups. */
function findLevelledClass(before: ClassLevel[], after: ClassLevel[]): string {
  for (const entry of after) {
    const prior = before.find(b => b.name.toLowerCase().trim() === entry.name.toLowerCase().trim())
    if (!prior || prior.level < entry.level) return entry.name
  }
  return after[after.length - 1]?.name ?? ''
}

function isLevelData(v: unknown): v is { features: ApiFeature[] } {
  return (
    typeof v === 'object' && v !== null &&
    'features' in v && Array.isArray((v as Record<string, unknown>).features)
  )
}

function isFeatureDetail(v: unknown): v is FeatureDetail {
  return (
    typeof v === 'object' && v !== null &&
    'name' in v && 'desc' in v &&
    Array.isArray((v as Record<string, unknown>).desc)
  )
}
