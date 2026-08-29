'use client'

import React, { useEffect, useMemo, useState } from 'react'
import type { ClassLevel } from '@/types'
import { getApiClassIndex } from '@/data/spellSlots'

// Every class feature a character has actually gained so far — the persistent
// counterpart to LevelUpModal's one-time "Features Gained" popup. A player who
// saw Rage flash by when they hit level 1 otherwise has no way to look it back
// up; this tab lists everything gained at or below the character's current
// level in each of their classes, not just the most recent level-up.

type ApiFeature = { index: string; name: string }
type FeatureDetail = { name: string; desc: string[] }

interface GainedFeature extends ApiFeature {
  level: number
  className: string
}

export function FeaturesTab({ classes }: { classes: ClassLevel[] }) {
  const [features, setFeatures] = useState<GainedFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [unresolvedClasses, setUnresolvedClasses] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailCache, setDetailCache] = useState<Record<string, FeatureDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Serialized so the effect only re-runs when the actual class/level data
  // changes, not on every re-render of the parent character sheet.
  const classesKey = useMemo(
    () => JSON.stringify(classes.map(c => ({ name: c.name, level: c.level }))),
    [classes],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function loadClass(entry: ClassLevel): Promise<{ index: string; features: GainedFeature[] } | null> {
      const apiIndex = getApiClassIndex(entry.name)
      if (!apiIndex) return null
      const levelResults = await Promise.all(
        Array.from({ length: entry.level }, (_, i) => i + 1).map(level =>
          fetch(`https://www.dnd5eapi.co/api/classes/${apiIndex}/levels/${level}`)
            .then(r => r.json())
            .catch(() => null)
        )
      )
      const gained: GainedFeature[] = []
      levelResults.forEach((data: unknown, i) => {
        if (!isLevelData(data)) return
        for (const f of data.features) {
          gained.push({ ...f, level: i + 1, className: entry.name })
        }
      })
      return { index: apiIndex, features: gained }
    }

    Promise.all(classes.map(loadClass)).then(results => {
      if (cancelled) return
      const seen = new Set<string>()
      const merged: GainedFeature[] = []
      const unresolved: string[] = []
      results.forEach((result, i) => {
        if (!result) { unresolved.push(classes[i].name); return }
        for (const f of result.features) {
          if (seen.has(f.index)) continue
          seen.add(f.index)
          merged.push(f)
        }
      })
      merged.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
      setFeatures(merged)
      setUnresolvedClasses(unresolved)
      setLoading(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesKey])

  const fetchDetail = async (index: string) => {
    if (detailCache[index]) return
    setDetailLoading(index)
    try {
      const res = await fetch(`https://www.dnd5eapi.co/api/features/${index}`)
      const data: unknown = await res.json()
      if (isFeatureDetail(data)) setDetailCache(prev => ({ ...prev, [index]: data }))
    } catch { /* leave detailLoading cleared below */ }
    setDetailLoading(null)
  }

  const handleToggle = (index: string) => {
    const next = expanded === index ? null : index
    setExpanded(next)
    if (next) void fetchDetail(next)
  }

  const filtered = features.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
  const isMulticlass = classes.length > 1

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-500 text-sm">
        Loading features…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search your features…"
        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-600"
      />

      {unresolvedClasses.length > 0 && (
        <p className="text-xs text-stone-600">
          {unresolvedClasses.join(', ')} {unresolvedClasses.length === 1 ? "isn't" : "aren't"} in the SRD —
          check the Rulebook tab or your class's source material for those features.
        </p>
      )}

      {filtered.length === 0 && unresolvedClasses.length === 0 && (
        <p className="text-center py-16 text-stone-500 text-sm">No features found.</p>
      )}

      <div className="space-y-1">
        {filtered.map(f => (
          <div key={f.index} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
            <button
              onClick={() => handleToggle(f.index)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-stone-800/50 transition-colors"
            >
              <span className="text-sm font-medium text-stone-100">{f.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[0.65rem] text-stone-500 bg-stone-800 border border-stone-700 rounded-full px-2 py-0.5">
                  {isMulticlass ? `${f.className} ${f.level}` : `Lv ${f.level}`}
                </span>
                <span className={`text-stone-500 text-xs transition-transform duration-200 inline-block ${expanded === f.index ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>
            {expanded === f.index && (
              <div className="px-4 pb-4 border-t border-stone-800 pt-3">
                {detailLoading === f.index && <p className="text-stone-500 text-xs">Loading…</p>}
                {detailCache[f.index] && (
                  <div className="space-y-1.5">
                    {detailCache[f.index].desc.map((para, i) => (
                      <p key={i} className="text-stone-300 text-xs leading-relaxed">{para}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function isLevelData(v: unknown): v is { features: ApiFeature[] } {
  return (
    typeof v === 'object' && v !== null &&
    Array.isArray((v as Record<string, unknown>).features)
  )
}

function isFeatureDetail(v: unknown): v is FeatureDetail {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).name === 'string' &&
    Array.isArray((v as Record<string, unknown>).desc)
  )
}
