'use client'

import React, { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CampaignMap, BattleToken, FogStroke, BattleMapAnnotation, AoEShape } from '@/types'
import { HexToken } from './HexToken'
import { BUILTIN_LIBRARY } from '@/lib/battlemap/builtinLibrary'
import { FogLayer } from './BattleMapEditor'

export function PlayerBattleMapView({ battleMap }: { battleMap: CampaignMap }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 })

  const [tokens, setTokens] = useState<BattleToken[]>([])
  const [fogStrokes, setFogStrokes] = useState<FogStroke[]>([])
  const [annotations, setAnnotations] = useState<BattleMapAnnotation[]>([])
  const [pings, setPings] = useState<{ id: string; x: number; y: number }[]>([])

  async function loadTokens() {
    const data = await fetch(`/api/battlemap/tokens?battleMapId=${battleMap.id}&forPlayers=true`).then(r => r.json())
    if (Array.isArray(data.tokens)) setTokens(data.tokens)
  }
  async function loadFog() {
    const data = await fetch(`/api/battlemap/fog?battleMapId=${battleMap.id}`).then(r => r.json())
    if (data.fog) setFogStrokes(data.fog.strokes)
  }
  async function loadAnnotations() {
    const data = await fetch(`/api/battlemap/annotations?battleMapId=${battleMap.id}`).then(r => r.json())
    if (Array.isArray(data.annotations)) setAnnotations(data.annotations)
  }

  useEffect(() => {
    void loadTokens(); void loadFog(); void loadAnnotations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleMap.id])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`battlemap-editor:${battleMap.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_tokens', filter: `battle_map_id=eq.${battleMap.id}` },
        () => { void loadTokens() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_map_fog', filter: `battle_map_id=eq.${battleMap.id}` },
        () => { void loadFog() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_map_annotations', filter: `battle_map_id=eq.${battleMap.id}` },
        () => { void loadAnnotations() })
      .on('broadcast', { event: 'ping' }, payload => {
        const p = payload.payload as { x: number; y: number }
        const id = crypto.randomUUID()
        setPings(prev => [...prev, { id, x: p.x, y: p.y }])
        setTimeout(() => setPings(prev => prev.filter(x => x.id !== id)), 1600)
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleMap.id])

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

  function pathFor(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ''
    return `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
  }

  return (
    <div ref={containerRef} className="w-full h-full relative bg-stone-950 overflow-hidden">
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
        <svg className="absolute pointer-events-none" style={{ left: imgRect.x, top: imgRect.y, width: imgRect.w, height: imgRect.h }} viewBox="0 0 1 1" preserveAspectRatio="none">
          {annotations.filter(a => a.kind === 'aoe').map(a => {
            const d = a.data as { shape: AoEShape; originX: number; originY: number; targetX: number; targetY: number; color: string }
            const dist = Math.hypot(d.targetX - d.originX, d.targetY - d.originY)
            if (d.shape === 'circle') return <circle key={a.id} cx={d.originX} cy={d.originY} r={dist} fill={`${d.color}33`} stroke={d.color} strokeWidth={0.003} />
            return null
          })}
          {annotations.filter(a => a.kind === 'pencil').map(a => {
            const d = a.data as { points: { x: number; y: number }[]; color: string }
            return <path key={a.id} d={pathFor(d.points)} stroke={d.color} strokeWidth={0.006} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          })}
          {annotations.filter(a => a.kind === 'text').map(a => {
            const d = a.data as { x: number; y: number; text: string; color: string }
            return (
              <g key={a.id}>
                <rect x={d.x} y={d.y - 0.018} width={Math.min(0.4, d.text.length * 0.012 + 0.02)} height={0.032} fill="rgba(12,10,9,0.85)" rx={0.004} />
                <text x={d.x + 0.006} y={d.y + 0.006} fontSize={0.022} fill={d.color}>{d.text}</text>
              </g>
            )
          })}
          <FogLayer strokes={fogStrokes} draft={null} dm={false} />
          {pings.map(p => <PlayerPing key={p.id} x={p.x} y={p.y} />)}
        </svg>
      )}

      {imgRect.w > 0 && tokens.map(t => {
        const px = imgRect.x + t.x * imgRect.w
        const py = imgRect.y + t.y * imgRect.h
        const size = 40 * t.size
        const builtin = t.libraryKey ? BUILTIN_LIBRARY.find(b => b.key === t.libraryKey) : undefined
        return (
          <div key={t.id} className="absolute" style={{ left: px - size / 2, top: py - size / 2 }}>
            <HexToken imageUrl={t.imageUrl} emoji={builtin?.emoji} color={t.color} label={t.name} size={size} />
            <p className="text-[10px] text-center text-stone-300 mt-0.5 whitespace-nowrap" style={{ textShadow: '0 1px 2px black' }}>{t.name}</p>
          </div>
        )
      })}
    </div>
  )
}

function PlayerPing({ x, y }: { x: number; y: number }) {
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
