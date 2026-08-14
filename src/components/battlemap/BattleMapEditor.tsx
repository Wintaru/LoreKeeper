'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  Character, CampaignMap, BattleToken, FogStroke, BattleMapAnnotation,
  BattleTokenLibraryEntry, AoEShape, StatusEffect, TokenKind,
} from '@/types'
import { HexToken } from './HexToken'
import { TokenImageCropper } from './TokenImageCropper'
import { BUILTIN_LIBRARY } from '@/lib/battlemap/builtinLibrary'

type Tool = 'select' | 'fogPaint' | 'fogErase' | 'pencil' | 'text' | 'aoe' | 'ruler' | 'ping'

const BRUSH_RADIUS = 0.035
const PENCIL_WIDTH = 0.006
const STD_DICE = [4, 6, 8, 10, 12, 20, 100]

type HistoryEntry = {
  label: string
  forward: () => Promise<void>
  backward: () => Promise<void>
}

function rollExpr(count: number, sides: number, mod: number): number {
  let total = mod
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1
  return total
}

export function BattleMapEditor({
  campaignId,
  battleMap,
  characters,
  onClose,
}: {
  campaignId: string
  battleMap: CampaignMap
  characters: Character[]
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 })

  const [tokens, setTokens] = useState<BattleToken[]>([])
  const [fogStrokes, setFogStrokes] = useState<FogStroke[]>([])
  const [feetPerUnit, setFeetPerUnit] = useState(60)
  const [annotations, setAnnotations] = useState<BattleMapAnnotation[]>([])
  const [library, setLibrary] = useState<BattleTokenLibraryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [tool, setTool] = useState<Tool>('select')
  const [aoeShape, setAoeShape] = useState<AoEShape>('circle')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [draggingToken, setDraggingToken] = useState<{ id: string; startX: number; startY: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const draftStroke = useRef<{ id: string; tool: 'paint' | 'erase'; points: { x: number; y: number }[] } | null>(null)
  const [draftStrokeVersion, setDraftStrokeVersion] = useState(0)
  const draftPencil = useRef<{ x: number; y: number }[] | null>(null)
  const [draftPencilVersion, setDraftPencilVersion] = useState(0)
  const [aoeDraft, setAoeDraft] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null)
  const [rulerDraft, setRulerDraft] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null)
  const [textPending, setTextPending] = useState<{ x: number; y: number } | null>(null)
  const [pings, setPings] = useState<{ id: string; x: number; y: number }[]>([])
  const [scaleCalibrating, setScaleCalibrating] = useState(false)
  const [scaleDraft, setScaleDraft] = useState<{ ox: number; oy: number; tx: number; ty: number } | null>(null)
  const [scalePromptFeet, setScalePromptFeet] = useState('')

  const [showLibrary, setShowLibrary] = useState(false)
  const [placing, setPlacing] = useState<{ kind: TokenKind; characterId?: string; libraryKey?: string; name: string; baseName: string; imageUrl: string | null; color: string; emoji?: string } | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadColor, setUploadColor] = useState('#78716c')

  const [showDice, setShowDice] = useState(false)
  const [diceMod, setDiceMod] = useState(0)
  const [diceAdv, setDiceAdv] = useState<'none' | 'adv' | 'dis'>('none')
  const [diceHistory, setDiceHistory] = useState<{ label: string; result: string }[]>([])

  const [effectPanelOpen, setEffectPanelOpen] = useState(false)
  const [effectName, setEffectName] = useState('')
  const [effectRollType, setEffectRollType] = useState('')
  const [effectModifier, setEffectModifier] = useState(-2)
  const [effectMode, setEffectMode] = useState<StatusEffect['mode']>('penalty')

  const history = useRef<HistoryEntry[]>([])
  const redoHistory = useRef<HistoryEntry[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    const [tRes, fRes, sRes, aRes, lRes] = await Promise.all([
      fetch(`/api/battlemap/tokens?battleMapId=${battleMap.id}`).then(r => r.json()),
      fetch(`/api/battlemap/fog?battleMapId=${battleMap.id}`).then(r => r.json()),
      fetch(`/api/battlemap/scale?battleMapId=${battleMap.id}`).then(r => r.json()),
      fetch(`/api/battlemap/annotations?battleMapId=${battleMap.id}`).then(r => r.json()),
      fetch(`/api/battlemap/library?campaignId=${campaignId}`).then(r => r.json()),
    ])
    if (Array.isArray(tRes.tokens)) setTokens(tRes.tokens)
    if (fRes.fog) setFogStrokes(fRes.fog.strokes)
    if (sRes.scale) setFeetPerUnit(sRes.scale.feetPerUnit)
    if (Array.isArray(aRes.annotations)) setAnnotations(aRes.annotations)
    if (Array.isArray(lRes.entries)) setLibrary(lRes.entries)
    setLoading(false)
  }, [battleMap.id, campaignId])

  useEffect(() => { void loadAll() }, [loadAll])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`battlemap-editor:${battleMap.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_tokens', filter: `battle_map_id=eq.${battleMap.id}` },
        () => { void fetch(`/api/battlemap/tokens?battleMapId=${battleMap.id}`).then(r => r.json()).then(d => { if (Array.isArray(d.tokens)) setTokens(d.tokens) }) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_map_annotations', filter: `battle_map_id=eq.${battleMap.id}` },
        () => { void fetch(`/api/battlemap/annotations?battleMapId=${battleMap.id}`).then(r => r.json()).then(d => { if (Array.isArray(d.annotations)) setAnnotations(d.annotations) }) })
      .on('broadcast', { event: 'ping' }, payload => {
        const p = payload.payload as { x: number; y: number }
        const id = crypto.randomUUID()
        setPings(prev => [...prev, { id, x: p.x, y: p.y }])
        setTimeout(() => setPings(prev => prev.filter(x => x.id !== id)), 1600)
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [battleMap.id])

  // ── Layout tracking ─────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function recompute() {
      if (!el) return
      const cw = el.clientWidth, ch = el.clientHeight
      const scale = Math.min(cw / imgNatural.w, ch / imgNatural.h)
      const w = imgNatural.w * scale, h = imgNatural.h * scale
      setImgRect({ x: (cw - w) / 2, y: (ch - h) / 2, w, h })
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [imgNatural])

  function toNorm(clientX: number, clientY: number): { x: number; y: number } {
    const el = containerRef.current
    if (!el || imgRect.w === 0) return { x: 0, y: 0 }
    const rect = el.getBoundingClientRect()
    const px = clientX - rect.left - imgRect.x
    const py = clientY - rect.top - imgRect.y
    return { x: Math.min(1, Math.max(0, px / imgRect.w)), y: Math.min(1, Math.max(0, py / imgRect.h)) }
  }

  // ── History ─────────────────────────────────────────────────────────────────

  function pushHistory(entry: HistoryEntry) {
    history.current = [...history.current.slice(-19), entry]
    redoHistory.current = []
    setHistoryVersion(v => v + 1)
  }

  async function undo() {
    const entry = history.current.pop()
    if (!entry) return
    await entry.backward()
    redoHistory.current = [...redoHistory.current, entry]
    setHistoryVersion(v => v + 1)
  }

  async function redo() {
    const entry = redoHistory.current.pop()
    if (!entry) return
    await entry.forward()
    history.current = [...history.current, entry]
    setHistoryVersion(v => v + 1)
  }

  // ── Token API helpers ───────────────────────────────────────────────────────

  async function patchToken(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/battlemap/tokens/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (data.token) setTokens(prev => prev.map(t => t.id === id ? data.token : t))
    return data.token as BattleToken | undefined
  }

  async function addToken(payload: {
    kind: TokenKind; characterId?: string | null; name: string; baseName: string
    libraryKey?: string | null; imageUrl?: string | null; storagePath?: string | null
    color: string; x: number; y: number
  }): Promise<BattleToken | null> {
    const res = await fetch('/api/battlemap/tokens', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, battleMapId: battleMap.id, ...payload }),
    })
    const data = await res.json()
    if (data.token) {
      setTokens(prev => [...prev, data.token])
      return data.token
    }
    return null
  }

  async function deleteTokenRaw(id: string) {
    await fetch(`/api/battlemap/tokens/${id}`, { method: 'DELETE' })
    setTokens(prev => prev.filter(t => t.id !== id))
  }

  // ── Pointer handling ────────────────────────────────────────────────────────

  function tokenAt(nx: number, ny: number): BattleToken | null {
    let best: BattleToken | null = null
    let bestDist = Infinity
    for (const t of tokens) {
      const d = Math.hypot(t.x - nx, t.y - ny)
      if (d < 0.035 && d < bestDist) { best = t; bestDist = d }
    }
    return best
  }

  function onContainerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const { x, y } = toNorm(e.clientX, e.clientY)
    if (scaleCalibrating) {
      setScaleDraft({ ox: x, oy: y, tx: x, ty: y })
      return
    }
    if (tool === 'select') {
      const hit = tokenAt(x, y)
      if (hit) {
        if (e.shiftKey) {
          setSelectedIds(prev => prev.includes(hit.id) ? prev.filter(i => i !== hit.id) : [...prev, hit.id])
        } else if (!selectedIds.includes(hit.id)) {
          setSelectedIds([hit.id])
        }
        setDraggingToken({ id: hit.id, startX: hit.x, startY: hit.y })
      } else {
        if (!e.shiftKey) setSelectedIds([])
        setMarquee({ x0: x, y0: y, x1: x, y1: y })
      }
      return
    }
    if (tool === 'fogPaint' || tool === 'fogErase') {
      draftStroke.current = { id: crypto.randomUUID(), tool: tool === 'fogPaint' ? 'paint' : 'erase', points: [{ x, y }] }
      setDraftStrokeVersion(v => v + 1)
      return
    }
    if (tool === 'pencil') {
      draftPencil.current = [{ x, y }]
      setDraftPencilVersion(v => v + 1)
      return
    }
    if (tool === 'text') {
      setTextPending({ x, y })
      return
    }
    if (tool === 'aoe') {
      setAoeDraft({ ox: x, oy: y, tx: x, ty: y })
      return
    }
    if (tool === 'ruler') {
      setRulerDraft({ ox: x, oy: y, tx: x, ty: y })
      return
    }
    if (tool === 'ping') {
      const supabase = createClient()
      void supabase.channel(`battlemap-editor:${battleMap.id}`).send({ type: 'broadcast', event: 'ping', payload: { x, y } })
      const id = crypto.randomUUID()
      setPings(prev => [...prev, { id, x, y }])
      setTimeout(() => setPings(prev => prev.filter(p => p.id !== id)), 1600)
      return
    }
  }

  function onContainerPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const { x, y } = toNorm(e.clientX, e.clientY)
    if (scaleCalibrating && scaleDraft) { setScaleDraft({ ...scaleDraft, tx: x, ty: y }); return }
    if (draggingToken) {
      setTokens(prev => prev.map(t => t.id === draggingToken.id ? { ...t, x, y } : t))
      return
    }
    if (marquee) { setMarquee({ ...marquee, x1: x, y1: y }); return }
    if (draftStroke.current) { draftStroke.current.points.push({ x, y }); setDraftStrokeVersion(v => v + 1); return }
    if (draftPencil.current) { draftPencil.current.push({ x, y }); setDraftPencilVersion(v => v + 1); return }
    if (aoeDraft) { setAoeDraft({ ...aoeDraft, tx: x, ty: y }); return }
    if (rulerDraft) { setRulerDraft({ ...rulerDraft, tx: x, ty: y }); return }
  }

  async function onContainerPointerUp() {
    if (scaleCalibrating && scaleDraft) {
      // wait for the feet prompt; keep scaleDraft so the line stays visible
      return
    }
    if (draggingToken) {
      const t = tokens.find(tk => tk.id === draggingToken.id)
      const before = { x: draggingToken.startX, y: draggingToken.startY }
      const after = t ? { x: t.x, y: t.y } : before
      setDraggingToken(null)
      if (t && (before.x !== after.x || before.y !== after.y)) {
        await patchToken(t.id, after)
        pushHistory({
          label: 'Move token',
          forward: async () => { await patchToken(t.id, after) },
          backward: async () => { await patchToken(t.id, before) },
        })
      }
      return
    }
    if (marquee) {
      const xMin = Math.min(marquee.x0, marquee.x1), xMax = Math.max(marquee.x0, marquee.x1)
      const yMin = Math.min(marquee.y0, marquee.y1), yMax = Math.max(marquee.y0, marquee.y1)
      const within = tokens.filter(t => t.x >= xMin && t.x <= xMax && t.y >= yMin && t.y <= yMax).map(t => t.id)
      if (within.length > 0) setSelectedIds(prev => Array.from(new Set([...prev, ...within])))
      setMarquee(null)
      return
    }
    if (draftStroke.current) {
      const stroke = draftStroke.current
      draftStroke.current = null
      setDraftStrokeVersion(v => v + 1)
      if (stroke.points.length < 2) return
      const before = fogStrokes
      const after = [...fogStrokes, { ...stroke, radius: BRUSH_RADIUS }]
      setFogStrokes(after)
      await fetch('/api/battlemap/fog', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleMapId: battleMap.id, strokes: after }),
      })
      pushHistory({
        label: stroke.tool === 'paint' ? 'Paint fog' : 'Erase fog',
        forward: async () => { setFogStrokes(after); await fetch('/api/battlemap/fog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ battleMapId: battleMap.id, strokes: after }) }) },
        backward: async () => { setFogStrokes(before); await fetch('/api/battlemap/fog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ battleMapId: battleMap.id, strokes: before }) }) },
      })
      return
    }
    if (draftPencil.current) {
      const points = draftPencil.current
      draftPencil.current = null
      setDraftPencilVersion(v => v + 1)
      if (points.length < 2) return
      const res = await fetch('/api/battlemap/annotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleMapId: battleMap.id, kind: 'pencil', data: { points, color: '#facc15' } }),
      })
      const data = await res.json()
      if (data.annotation) {
        setAnnotations(prev => [...prev, data.annotation])
        const id = data.annotation.id as string
        pushHistory({
          label: 'Pencil mark',
          forward: async () => { /* re-adding recreates with new id; acceptable */ },
          backward: async () => { await fetch(`/api/battlemap/annotations/${id}`, { method: 'DELETE' }); setAnnotations(prev => prev.filter(a => a.id !== id)) },
        })
      }
      return
    }
    if (aoeDraft) {
      const draft = aoeDraft
      setAoeDraft(null)
      if (Math.hypot(draft.tx - draft.ox, draft.ty - draft.oy) < 0.01) return
      const res = await fetch('/api/battlemap/annotations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleMapId: battleMap.id, kind: 'aoe', data: { shape: aoeShape, originX: draft.ox, originY: draft.oy, targetX: draft.tx, targetY: draft.ty, color: '#f97316' } }),
      })
      const data = await res.json()
      if (data.annotation) {
        setAnnotations(prev => [...prev, data.annotation])
        const id = data.annotation.id as string
        pushHistory({
          label: 'AoE template',
          forward: async () => {},
          backward: async () => { await fetch(`/api/battlemap/annotations/${id}`, { method: 'DELETE' }); setAnnotations(prev => prev.filter(a => a.id !== id)) },
        })
      }
      return
    }
    if (rulerDraft) {
      // keep visible; cleared when a new ruler drag starts or tool changes
      return
    }
  }

  function confirmScale() {
    if (!scaleDraft) return
    const feet = parseFloat(scalePromptFeet)
    if (!feet || feet <= 0) return
    const dist = Math.hypot(scaleDraft.tx - scaleDraft.ox, scaleDraft.ty - scaleDraft.oy)
    if (dist < 0.005) return
    const newFeetPerUnit = feet / dist
    setFeetPerUnit(newFeetPerUnit)
    void fetch('/api/battlemap/scale', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ battleMapId: battleMap.id, feetPerUnit: newFeetPerUnit }),
    })
    setScaleCalibrating(false)
    setScaleDraft(null)
    setScalePromptFeet('')
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        void deleteSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); void undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); void redo() }
      if (e.key === 'Escape') { setSelectedIds([]); setPlacing(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds])

  // ── Selection actions ───────────────────────────────────────────────────────

  async function deleteSelected() {
    const ids = selectedIds
    const removed = tokens.filter(t => ids.includes(t.id))
    setSelectedIds([])
    for (const id of ids) await deleteTokenRaw(id)
    pushHistory({
      label: `Delete ${ids.length} token(s)`,
      forward: async () => { for (const id of ids) await deleteTokenRaw(id) },
      backward: async () => {
        for (const t of removed) {
          await addToken({ kind: t.kind, characterId: t.characterId, name: t.name, baseName: t.baseName, libraryKey: t.libraryKey, imageUrl: t.imageUrl, storagePath: t.storagePath, color: t.color, x: t.x, y: t.y })
        }
      },
    })
  }

  async function toggleVisibilitySelected() {
    const targets = tokens.filter(t => selectedIds.includes(t.id))
    if (targets.length === 0) return
    const makeVisible = targets.some(t => !t.visibleToPlayers)
    for (const t of targets) await patchToken(t.id, { visibleToPlayers: makeVisible })
    pushHistory({
      label: 'Toggle visibility',
      forward: async () => { for (const t of targets) await patchToken(t.id, { visibleToPlayers: makeVisible }) },
      backward: async () => { for (const t of targets) await patchToken(t.id, { visibleToPlayers: !makeVisible }) },
    })
  }

  async function toggleRangeSelected() {
    const targets = tokens.filter(t => selectedIds.includes(t.id) && t.kind === 'player')
    if (targets.length === 0) return
    const show = targets.some(t => !t.showRange)
    for (const t of targets) await patchToken(t.id, { showRange: show })
  }

  async function cloneSelected() {
    const targets = tokens.filter(t => selectedIds.includes(t.id))
    const created: BattleToken[] = []
    for (const t of targets) {
      const c = await addToken({
        kind: t.kind, characterId: t.characterId, name: '', baseName: t.baseName,
        libraryKey: t.libraryKey, imageUrl: t.imageUrl, storagePath: t.storagePath,
        color: t.color, x: Math.min(0.97, t.x + 0.04), y: Math.min(0.97, t.y + 0.04),
      })
      if (c) created.push(c)
    }
    pushHistory({
      label: `Clone ${created.length} token(s)`,
      forward: async () => {},
      backward: async () => { for (const c of created) await deleteTokenRaw(c.id) },
    })
  }

  async function applyEffectToSelected() {
    if (!effectName.trim()) return
    const effect: StatusEffect = { name: effectName.trim(), rollType: effectRollType.trim() || 'all', modifier: effectModifier, mode: effectMode }
    const targets = tokens.filter(t => selectedIds.includes(t.id))
    for (const t of targets) {
      await patchToken(t.id, { statusEffects: [...t.statusEffects, effect] })
    }
    setEffectName(''); setEffectRollType(''); setEffectModifier(-2); setEffectPanelOpen(false)
  }

  async function removeEffect(tokenId: string, idx: number) {
    const t = tokens.find(tk => tk.id === tokenId)
    if (!t) return
    await patchToken(tokenId, { statusEffects: t.statusEffects.filter((_, i) => i !== idx) })
  }

  // ── Placing new tokens ──────────────────────────────────────────────────────

  function startPlacingPlayer(c: Character) {
    setPlacing({ kind: 'player', characterId: c.id, name: c.characterName, baseName: c.characterName, imageUrl: c.tokenImageUrl, color: c.tokenColor })
    setShowLibrary(false)
  }
  function startPlacingBuiltin(key: string) {
    const b = BUILTIN_LIBRARY.find(e => e.key === key)
    if (!b) return
    setPlacing({ kind: 'npc', libraryKey: b.key, name: '', baseName: b.name, imageUrl: null, color: b.color, emoji: b.emoji })
    setShowLibrary(false)
  }
  function startPlacingCustom(entry: BattleTokenLibraryEntry) {
    setPlacing({ kind: 'npc', libraryKey: entry.id, name: '', baseName: entry.baseName, imageUrl: entry.imageUrl, color: entry.color })
    setShowLibrary(false)
  }

  async function placeAt(nx: number, ny: number) {
    if (!placing) return
    const t = await addToken({
      kind: placing.kind, characterId: placing.characterId ?? null, name: placing.name,
      baseName: placing.baseName, libraryKey: placing.libraryKey ?? null, imageUrl: placing.imageUrl,
      storagePath: null, color: placing.color, x: nx, y: ny,
    })
    if (t) {
      pushHistory({ label: 'Add token', forward: async () => {}, backward: async () => { await deleteTokenRaw(t.id) } })
    }
    setPlacing(null)
  }

  async function uploadCustomLibraryEntry(blob: Blob) {
    if (!uploadName.trim()) return
    const fd = new FormData()
    fd.append('file', blob, 'token.png')
    fd.append('campaignId', campaignId)
    fd.append('name', uploadName.trim())
    fd.append('color', uploadColor)
    const res = await fetch('/api/battlemap/library', { method: 'POST', body: fd })
    const data = await res.json()
    if (data.entry) setLibrary(prev => [...prev, data.entry])
    setShowCropper(false)
    setUploadName('')
  }

  async function deleteLibraryEntry(entry: BattleTokenLibraryEntry) {
    await fetch(`/api/battlemap/library/${entry.id}?storagePath=${encodeURIComponent(entry.storagePath)}`, { method: 'DELETE' })
    setLibrary(prev => prev.filter(e => e.id !== entry.id))
  }

  // ── Dice ────────────────────────────────────────────────────────────────────

  function rollDie(sides: number) {
    let label = `d${sides}`
    let result: number
    if (diceAdv !== 'none' && sides === 20) {
      const r1 = rollExpr(1, 20, 0), r2 = rollExpr(1, 20, 0)
      result = diceAdv === 'adv' ? Math.max(r1, r2) : Math.min(r1, r2)
      label = `d20 (${diceAdv === 'adv' ? 'adv' : 'dis'}: ${r1},${r2})`
      result += diceMod
    } else {
      result = rollExpr(1, sides, diceMod)
    }
    if (diceMod !== 0) label += diceMod > 0 ? ` +${diceMod}` : ` ${diceMod}`
    setDiceHistory(prev => [{ label, result: String(result) }, ...prev].slice(0, 12))
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  const selectedTokens = tokens.filter(t => selectedIds.includes(t.id))
  const availableCharacters = characters

  function pathFor(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ''
    return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <p className="text-stone-400">Loading battle map…</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 border-b border-stone-800 px-3 py-2 flex items-center justify-between bg-stone-900/80 flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-stone-100 truncate">{battleMap.name}</h2>
          <span className="text-xs text-stone-500 font-mono">{Math.round(feetPerUnit)} ft / map width</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => void undo()} disabled={history.current.length === 0}
            className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors">↶ Undo</button>
          <button onClick={() => void redo()} disabled={redoHistory.current.length === 0}
            className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 disabled:opacity-30 transition-colors">↷ Redo</button>
          <button onClick={() => { setScaleCalibrating(v => !v); setScaleDraft(null) }}
            className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${scaleCalibrating ? 'border-amber-600 text-amber-400 bg-amber-950/40' : 'border-stone-700 text-stone-400 hover:text-stone-200'}`}>📏 Set Scale</button>
          <button onClick={() => setShowDice(v => !v)}
            className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${showDice ? 'border-amber-600 text-amber-400 bg-amber-950/40' : 'border-stone-700 text-stone-400 hover:text-stone-200'}`}>🎲 Dice</button>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors">Close</button>
        </div>
      </div>

      {/* Tool bar */}
      <div className="shrink-0 border-b border-stone-800 px-3 py-2 flex items-center gap-1.5 flex-wrap bg-stone-900/50">
        {([
          ['select', '↖ Select'],
          ['fogPaint', '🌫 Fog'],
          ['fogErase', '🧽 Erase Fog'],
          ['pencil', '✏️ Pencil'],
          ['text', '🔤 Text'],
          ['aoe', '🎯 AoE'],
          ['ruler', '📐 Ruler'],
          ['ping', '📍 Ping'],
        ] as [Tool, string][]).map(([t, label]) => (
          <button key={t} onClick={() => { setTool(t); setRulerDraft(null) }}
            className={`px-2.5 py-1.5 rounded text-xs border transition-colors whitespace-nowrap ${tool === t ? 'border-amber-600 text-amber-400 bg-amber-950/40' : 'border-stone-700 text-stone-400 hover:text-stone-200'}`}>
            {label}
          </button>
        ))}
        {tool === 'aoe' && (
          <div className="flex gap-1 ml-1">
            {(['cone', 'circle', 'square', 'line'] as AoEShape[]).map(s => (
              <button key={s} onClick={() => setAoeShape(s)}
                className={`px-2 py-1 rounded text-xs border transition-colors capitalize ${aoeShape === s ? 'border-orange-500 text-orange-400 bg-orange-950/40' : 'border-stone-700 text-stone-500'}`}>{s}</button>
            ))}
          </div>
        )}
        <div className="w-px h-5 bg-stone-800 mx-1" />
        <button onClick={() => setShowLibrary(v => !v)}
          className={`px-2.5 py-1.5 rounded text-xs border transition-colors ${showLibrary ? 'border-emerald-600 text-emerald-400 bg-emerald-950/40' : 'border-stone-700 text-stone-400 hover:text-stone-200'}`}>+ Add Token</button>
        {placing && (
          <span className="text-xs text-amber-400 px-2 py-1 bg-amber-950/30 rounded border border-amber-800/50">
            Click the map to place &quot;{placing.baseName}&quot; · <button onClick={() => setPlacing(null)} className="underline">cancel</button>
          </span>
        )}

        {selectedIds.length > 0 && (
          <>
            <div className="w-px h-5 bg-stone-800 mx-1" />
            <span className="text-xs text-stone-500">{selectedIds.length} selected</span>
            <button onClick={() => void toggleVisibilitySelected()} className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors">👁 Hide/Reveal</button>
            {selectedTokens.some(t => t.kind === 'player') && (
              <button onClick={() => void toggleRangeSelected()} className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors">⭕ Range</button>
            )}
            <button onClick={() => void cloneSelected()} className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors">⧉ Clone</button>
            <button onClick={() => setEffectPanelOpen(v => !v)} className="px-2.5 py-1.5 rounded text-xs border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors">✦ Effect</button>
            <button onClick={() => void deleteSelected()} className="px-2.5 py-1.5 rounded text-xs border border-red-900 text-red-400 hover:bg-red-950/40 transition-colors">🗑 Delete</button>
          </>
        )}
      </div>

      {/* Effect panel */}
      {effectPanelOpen && selectedIds.length > 0 && (
        <div className="shrink-0 border-b border-stone-800 px-3 py-2 flex items-center gap-2 flex-wrap bg-stone-900/70">
          <input placeholder="Effect name (e.g. Drunk)" value={effectName} onChange={e => setEffectName(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-40" />
          <input placeholder="Roll type (e.g. dex)" value={effectRollType} onChange={e => setEffectRollType(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-32" />
          <select value={effectMode} onChange={e => setEffectMode(e.target.value as StatusEffect['mode'])}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200">
            <option value="penalty">Penalty</option>
            <option value="bonus">Bonus</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
          <input type="number" value={effectModifier} onChange={e => setEffectModifier(parseInt(e.target.value) || 0)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-16" />
          <button onClick={() => void applyEffectToSelected()} className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium transition-colors">Apply to Selected</button>
        </div>
      )}

      {/* Scale calibration prompt */}
      {scaleCalibrating && scaleDraft && (
        <div className="shrink-0 border-b border-stone-800 px-3 py-2 flex items-center gap-2 bg-stone-900/70">
          <span className="text-xs text-stone-400">This line equals</span>
          <input type="number" value={scalePromptFeet} onChange={e => setScalePromptFeet(e.target.value)} placeholder="feet"
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-20" />
          <span className="text-xs text-stone-400">feet</span>
          <button onClick={confirmScale} className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-medium transition-colors">Confirm</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Map canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative bg-stone-950 overflow-hidden touch-none"
          style={{ cursor: tool === 'select' ? (draggingToken ? 'grabbing' : 'default') : 'crosshair' }}
          onPointerDown={onContainerPointerDown}
          onPointerMove={onContainerPointerMove}
          onPointerUp={() => void onContainerPointerUp()}
          onClick={e => {
            if (!placing) return
            const { x, y } = toNorm(e.clientX, e.clientY)
            void placeAt(x, y)
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={battleMap.imageUrl}
            alt={battleMap.name}
            className="absolute select-none pointer-events-none"
            draggable={false}
            style={{ left: imgRect.x, top: imgRect.y, width: imgRect.w, height: imgRect.h }}
            onLoad={e => setImgNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />

          {imgRect.w > 0 && (
            <svg
              className="absolute pointer-events-none"
              style={{ left: imgRect.x, top: imgRect.y, width: imgRect.w, height: imgRect.h }}
              viewBox="0 0 1 1" preserveAspectRatio="none"
            >
              {/* AoE templates */}
              {annotations.filter(a => a.kind === 'aoe').map(a => {
                const d = a.data as { shape: AoEShape; originX: number; originY: number; targetX: number; targetY: number; color: string }
                return <AoEShapeSvg key={a.id} shape={d.shape} ox={d.originX} oy={d.originY} tx={d.targetX} ty={d.targetY} color={d.color} />
              })}
              {aoeDraft && <AoEShapeSvg shape={aoeShape} ox={aoeDraft.ox} oy={aoeDraft.oy} tx={aoeDraft.tx} ty={aoeDraft.ty} color="#f97316" />}

              {/* Pencil strokes */}
              {annotations.filter(a => a.kind === 'pencil').map(a => {
                const d = a.data as { points: { x: number; y: number }[]; color: string }
                return <path key={a.id} d={pathFor(d.points)} stroke={d.color} strokeWidth={PENCIL_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              })}
              {draftPencil.current && draftPencil.current.length > 1 && (
                <path d={pathFor(draftPencil.current)} stroke="#facc15" strokeWidth={PENCIL_WIDTH} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              )}

              {/* Text notes */}
              {annotations.filter(a => a.kind === 'text').map(a => {
                const d = a.data as { x: number; y: number; text: string; color: string }
                return (
                  <g key={a.id}>
                    <rect x={d.x} y={d.y - 0.018} width={Math.min(0.4, d.text.length * 0.012 + 0.02)} height={0.032} fill="rgba(12,10,9,0.85)" rx={0.004} />
                    <text x={d.x + 0.006} y={d.y + 0.006} fontSize={0.022} fill={d.color}>{d.text}</text>
                  </g>
                )
              })}

              {/* Ruler */}
              {rulerDraft && (
                <g>
                  <line x1={rulerDraft.ox} y1={rulerDraft.oy} x2={rulerDraft.tx} y2={rulerDraft.ty} stroke="#22d3ee" strokeWidth={0.003} strokeDasharray="0.01 0.006" />
                  <text x={(rulerDraft.ox + rulerDraft.tx) / 2} y={(rulerDraft.oy + rulerDraft.ty) / 2 - 0.015} fontSize={0.024} fill="#22d3ee" textAnchor="middle">
                    {(Math.hypot(rulerDraft.tx - rulerDraft.ox, rulerDraft.ty - rulerDraft.oy) * feetPerUnit).toFixed(0)} ft
                  </text>
                </g>
              )}
              {scaleDraft && (
                <line x1={scaleDraft.ox} y1={scaleDraft.oy} x2={scaleDraft.tx} y2={scaleDraft.ty} stroke="#fbbf24" strokeWidth={0.004} />
              )}

              {/* Range circles */}
              {tokens.filter(t => t.showRange && t.kind === 'player').map(t => {
                const c = characters.find(ch => ch.id === t.characterId)
                const speed = c?.speed ?? 30
                const r = speed / feetPerUnit
                return <circle key={`range-${t.id}`} cx={t.x} cy={t.y} r={r} fill="rgba(59,130,246,0.12)" stroke="#3b82f6" strokeWidth={0.003} />
              })}

              {/* Fog of war (semi-transparent for DM) */}
              <FogLayer strokes={fogStrokes} draft={draftStroke.current} dm />

              {/* Marquee */}
              {marquee && (
                <rect
                  x={Math.min(marquee.x0, marquee.x1)} y={Math.min(marquee.y0, marquee.y1)}
                  width={Math.abs(marquee.x1 - marquee.x0)} height={Math.abs(marquee.y1 - marquee.y0)}
                  fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth={0.003} strokeDasharray="0.008 0.006"
                />
              )}

              {/* Pings */}
              {pings.map(p => <PingRipple key={p.id} x={p.x} y={p.y} />)}
            </svg>
          )}

          {/* Tokens (HTML, not SVG, so HexToken can be reused) */}
          {imgRect.w > 0 && tokens.map(t => {
            const px = imgRect.x + t.x * imgRect.w
            const py = imgRect.y + t.y * imgRect.h
            const size = 40 * t.size
            const selected = selectedIds.includes(t.id)
            const builtin = t.libraryKey ? BUILTIN_LIBRARY.find(b => b.key === t.libraryKey) : undefined
            return (
              <div
                key={t.id}
                className="absolute"
                style={{ left: px - size / 2, top: py - size / 2, zIndex: selected ? 20 : 10 }}
              >
                <div className="relative" style={{ outline: selected ? '3px solid #fbbf24' : 'none', outlineOffset: 2, clipPath: selected ? undefined : undefined }}>
                  <HexToken imageUrl={t.imageUrl} emoji={builtin?.emoji} color={t.color} label={t.name} size={size} dimmed={!t.visibleToPlayers} />
                  {!t.visibleToPlayers && (
                    <span className="absolute -top-1 -right-1 text-[10px] bg-stone-900 border border-stone-600 rounded-full w-4 h-4 flex items-center justify-center">🚫</span>
                  )}
                  {t.statusEffects.length > 0 && (
                    <span className="absolute -bottom-1 -right-1 text-[10px] bg-purple-900 border border-purple-600 rounded-full w-4 h-4 flex items-center justify-center">✦</span>
                  )}
                </div>
                <p className="text-[10px] text-center text-stone-300 mt-0.5 whitespace-nowrap" style={{ textShadow: '0 1px 2px black' }}>{t.name}</p>
              </div>
            )
          })}

          {textPending && (
            <TextInputPopup
              style={{ left: imgRect.x + textPending.x * imgRect.w, top: imgRect.y + textPending.y * imgRect.h }}
              onCancel={() => setTextPending(null)}
              onSubmit={async text => {
                const res = await fetch('/api/battlemap/annotations', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ battleMapId: battleMap.id, kind: 'text', data: { x: textPending.x, y: textPending.y, text, color: '#fbbf24' } }),
                })
                const data = await res.json()
                if (data.annotation) setAnnotations(prev => [...prev, data.annotation])
                setTextPending(null)
              }}
            />
          )}
        </div>

        {/* Side panel */}
        {showLibrary && (
          <TokenLibraryPanel
            characters={availableCharacters}
            library={library}
            onPickCharacter={startPlacingPlayer}
            onPickBuiltin={startPlacingBuiltin}
            onPickCustom={startPlacingCustom}
            onUploadCustom={() => setShowCropper(true)}
            onDeleteCustom={e => void deleteLibraryEntry(e)}
            uploadName={uploadName} setUploadName={setUploadName}
            uploadColor={uploadColor} setUploadColor={setUploadColor}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {showDice && (
          <div className="w-64 shrink-0 border-l border-stone-800 bg-stone-900/50 p-3 space-y-3 overflow-y-auto">
            <h3 className="text-sm font-medium text-stone-200">Dice Tray</h3>
            <div className="flex gap-2 items-center flex-wrap">
              {(['none', 'adv', 'dis'] as const).map(m => (
                <button key={m} onClick={() => setDiceAdv(m)}
                  className={`px-2 py-1 rounded text-xs border transition-colors ${diceAdv === m ? 'border-amber-600 text-amber-400 bg-amber-950/40' : 'border-stone-700 text-stone-500'}`}>
                  {m === 'none' ? 'Normal' : m === 'adv' ? 'Advantage' : 'Disadvantage'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500">Modifier</span>
              <input type="number" value={diceMod} onChange={e => setDiceMod(parseInt(e.target.value) || 0)}
                className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-16" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {STD_DICE.map(d => (
                <button key={d} onClick={() => rollDie(d)} className="bg-stone-800 hover:bg-amber-700 text-stone-200 text-xs font-bold py-2 rounded-lg transition-colors">d{d}</button>
              ))}
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {diceHistory.map((h, i) => (
                <div key={i} className="text-xs bg-stone-800 rounded px-2 py-1 flex justify-between">
                  <span className="text-stone-500">{h.label}</span>
                  <span className="text-amber-400 font-bold">{h.result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTokens.length === 1 && selectedTokens[0].statusEffects.length > 0 && (
        <div className="shrink-0 border-t border-stone-800 px-3 py-2 flex items-center gap-2 flex-wrap bg-stone-900/70">
          <span className="text-xs text-stone-500">{selectedTokens[0].name} effects:</span>
          {selectedTokens[0].statusEffects.map((eff, i) => (
            <span key={i} className="text-xs bg-purple-950/50 border border-purple-800/50 text-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
              {eff.name} ({eff.mode} {eff.modifier >= 0 ? '+' : ''}{eff.modifier} {eff.rollType})
              <button onClick={() => void removeEffect(selectedTokens[0].id, i)} className="hover:text-red-400">✕</button>
            </span>
          ))}
        </div>
      )}

      {showCropper && (
        <TokenImageCropper
          onCancel={() => setShowCropper(false)}
          onConfirm={blob => void uploadCustomLibraryEntry(blob)}
        />
      )}
      {showCropper && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 border border-stone-700 rounded-xl p-3 flex items-center gap-2">
          <input placeholder="Name (e.g. Custom Ogre)" value={uploadName} onChange={e => setUploadName(e.target.value)}
            className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-40" />
          <input type="color" value={uploadColor} onChange={e => setUploadColor(e.target.value)} className="w-8 h-8 rounded" />
        </div>
      )}
    </div>
  )
}

// ── Fog layer (shared shape, DM vs player rendering differs by opacity) ────────

export function FogLayer({ strokes, draft, dm }: { strokes: FogStroke[]; draft: { tool: 'paint' | 'erase'; points: { x: number; y: number }[] } | null; dm: boolean }) {
  const maskId = React.useId()
  function pathFor(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ''
    return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  }
  return (
    <>
      <defs>
        <mask id={maskId}>
          <rect x={0} y={0} width={1} height={1} fill="black" />
          {strokes.map(s => (
            <path key={s.id} d={pathFor(s.points)} stroke={s.tool === 'paint' ? 'white' : 'black'} strokeWidth={s.radius * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          {draft && draft.points.length > 0 && (
            <path d={pathFor(draft.points)} stroke={draft.tool === 'paint' ? 'white' : 'black'} strokeWidth={BRUSH_RADIUS * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </mask>
      </defs>
      <rect x={0} y={0} width={1} height={1} fill={dm ? 'rgba(12,10,9,0.5)' : '#0c0a09'} mask={`url(#${maskId})`} pointerEvents="none" />
    </>
  )
}

function AoEShapeSvg({ shape, ox, oy, tx, ty, color }: { shape: AoEShape; ox: number; oy: number; tx: number; ty: number; color: string }) {
  const dist = Math.hypot(tx - ox, ty - oy)
  if (shape === 'circle') {
    return <circle cx={ox} cy={oy} r={dist} fill={`${color}33`} stroke={color} strokeWidth={0.003} />
  }
  if (shape === 'square') {
    const side = Math.max(Math.abs(tx - ox), Math.abs(ty - oy)) * 2
    return <rect x={ox - side / 2} y={oy - side / 2} width={side} height={side} fill={`${color}33`} stroke={color} strokeWidth={0.003} />
  }
  if (shape === 'line') {
    const angle = Math.atan2(ty - oy, tx - ox)
    const w = 0.012
    const nx = Math.cos(angle + Math.PI / 2) * w, ny = Math.sin(angle + Math.PI / 2) * w
    const pts = [[ox + nx, oy + ny], [tx + nx, ty + ny], [tx - nx, ty - ny], [ox - nx, oy - ny]]
    return <polygon points={pts.map(p => p.join(',')).join(' ')} fill={`${color}33`} stroke={color} strokeWidth={0.003} />
  }
  // cone
  const angle = Math.atan2(ty - oy, tx - ox)
  const half = (53 * Math.PI) / 180 / 2
  const p1 = [ox + Math.cos(angle - half) * dist, oy + Math.sin(angle - half) * dist]
  const p2 = [ox + Math.cos(angle + half) * dist, oy + Math.sin(angle + half) * dist]
  return <polygon points={`${ox},${oy} ${p1.join(',')} ${p2.join(',')}`} fill={`${color}33`} stroke={color} strokeWidth={0.003} />
}

function PingRipple({ x, y }: { x: number; y: number }) {
  const [r, setR] = useState(0.005)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      const t = (Date.now() - start) / 1200
      setR(0.005 + Math.min(1, t) * 0.05)
    }, 40)
    return () => clearInterval(id)
  }, [])
  return <circle cx={x} cy={y} r={r} fill="none" stroke="#22d3ee" strokeWidth={0.004} opacity={Math.max(0, 1 - r * 15)} />
}

function TextInputPopup({ style, onSubmit, onCancel }: { style: React.CSSProperties; onSubmit: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState('')
  return (
    <div className="absolute z-30 bg-stone-900 border border-amber-700 rounded-lg p-2 flex gap-1" style={style}>
      <input
        autoFocus value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && text.trim()) onSubmit(text.trim()); if (e.key === 'Escape') onCancel() }}
        placeholder="Note text…" className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 w-40"
      />
      <button onClick={() => { if (text.trim()) onSubmit(text.trim()) }} className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-2 rounded">✓</button>
      <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 px-1">✕</button>
    </div>
  )
}

function TokenLibraryPanel({
  characters, library, onPickCharacter, onPickBuiltin, onPickCustom, onUploadCustom, onDeleteCustom,
  uploadName, setUploadName, uploadColor, setUploadColor, onClose,
}: {
  characters: Character[]
  library: BattleTokenLibraryEntry[]
  onPickCharacter: (c: Character) => void
  onPickBuiltin: (key: string) => void
  onPickCustom: (entry: BattleTokenLibraryEntry) => void
  onUploadCustom: () => void
  onDeleteCustom: (entry: BattleTokenLibraryEntry) => void
  uploadName: string; setUploadName: (v: string) => void
  uploadColor: string; setUploadColor: (v: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'players' | 'builtin' | 'custom'>('players')
  const [search, setSearch] = useState('')
  const filteredBuiltin = BUILTIN_LIBRARY.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="w-72 shrink-0 border-l border-stone-800 bg-stone-900/50 flex flex-col min-h-0">
      <div className="p-3 border-b border-stone-800 flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-200">Add Token</h3>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
      </div>
      <div className="flex border-b border-stone-800">
        {(['players', 'builtin', 'custom'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${tab === t ? 'text-amber-400 border-b-2 border-amber-500' : 'text-stone-500'}`}>{t}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {tab === 'players' && characters.map(c => (
          <button key={c.id} onClick={() => onPickCharacter(c)} className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-stone-800 transition-colors text-left">
            <HexToken imageUrl={c.tokenImageUrl} color={c.tokenColor} label={c.characterName} size={32} />
            <span className="text-xs text-stone-300 truncate">{c.characterName}</span>
          </button>
        ))}
        {tab === 'builtin' && (
          <>
            <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 mb-1" />
            <div className="grid grid-cols-3 gap-1.5">
              {filteredBuiltin.map(b => (
                <button key={b.key} onClick={() => onPickBuiltin(b.key)} title={b.name} className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-stone-800 transition-colors">
                  <HexToken emoji={b.emoji} color={b.color} label={b.name} size={32} />
                  <span className="text-[9px] text-stone-500 truncate w-full text-center">{b.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {tab === 'custom' && (
          <>
            <button onClick={onUploadCustom} className="w-full py-2 rounded-lg border-2 border-dashed border-stone-700 hover:border-stone-600 text-xs text-stone-400 transition-colors mb-2">+ Upload Custom Token</button>
            <div className="flex items-center gap-2 mb-2">
              <input placeholder="Pending upload name" value={uploadName} onChange={e => setUploadName(e.target.value)}
                className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200" />
              <input type="color" value={uploadColor} onChange={e => setUploadColor(e.target.value)} className="w-7 h-7 rounded" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {library.map(entry => (
                <div key={entry.id} className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-stone-800 transition-colors group relative">
                  <button onClick={() => onPickCustom(entry)}>
                    <HexToken imageUrl={entry.imageUrl} color={entry.color} label={entry.name} size={32} />
                  </button>
                  <span className="text-[9px] text-stone-500 truncate w-full text-center">{entry.name}</span>
                  <button onClick={() => onDeleteCustom(entry)} className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 bg-red-900 rounded-full items-center justify-center text-[9px]">✕</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
