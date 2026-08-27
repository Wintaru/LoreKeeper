'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Character, CustomCurrencyEntry, FateEvent, FateEventType, Whisper, CampaignMap, BattleMap, MapViewport, InitiativeRequest, Quest, RosterSummary } from '@/types'
import { SpellsTab } from '@/components/SpellsTab'
import { RulebookTab } from '@/components/RulebookTab'
import { LevelUpModal } from '@/components/LevelUpModal'
import { PlayerBattleMapView } from '@/components/battlemap/PlayerBattleMapView'
import { TokenAppearancePicker } from '@/components/battlemap/TokenAppearancePicker'

const XP_THRESHOLDS = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000]
function xpForNextLevel(level: number) { return level >= 20 ? null : XP_THRESHOLDS[level] }

type RollEntry = { label: string; result: number | string; timestamp: Date }

function rollExpression(expr: string): number | string {
  try {
    const clean = expr.trim().toLowerCase()
    const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/)
    if (match) {
      const count = parseInt(match[1])
      const sides = parseInt(match[2])
      const mod = match[3] ? parseInt(match[3]) : 0
      if (count < 1 || count > 100 || sides < 2 || sides > 1000) return 'Invalid'
      let total = 0
      for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1
      return total + mod
    }
    if (/^\d+$/.test(clean)) return parseInt(clean)
    return 'Invalid'
  } catch { return 'Invalid' }
}

const EVENT_LABELS: Record<FateEventType, string> = {
  attack:   'Attack',
  curse:    'Curse',
  windfall: 'Windfall',
  betrayal: 'Betrayal',
  mystery:  'Mystery',
}

const CONDITION_ICONS: Record<string, string> = {
  blinded:       '👁️',
  charmed:       '💗',
  deafened:      '🔇',
  exhaustion:    '💤',
  frightened:    '😨',
  grappled:      '🤼',
  incapacitated: '😵',
  invisible:     '👻',
  paralyzed:     '⚡',
  petrified:     '🪨',
  poisoned:      '🤢',
  prone:         '↙️',
  restrained:    '⛓️',
  stunned:       '💫',
  unconscious:   '😴',
}

const EVENT_TOAST: Record<FateEventType, { message: string; classes: string }> = {
  attack:   { message: 'An attack is coming for you…',    classes: 'bg-red-950 border-red-500 text-red-200' },
  curse:    { message: 'A dark power takes hold…',         classes: 'bg-purple-950 border-purple-500 text-purple-200' },
  windfall: { message: 'Fortune smiles upon you…',         classes: 'bg-emerald-950 border-emerald-500 text-emerald-200' },
  betrayal: { message: 'Trust is about to shatter…',       classes: 'bg-orange-950 border-orange-500 text-orange-200' },
  mystery:  { message: 'The fates have chosen you…',       classes: 'bg-amber-950 border-amber-500 text-amber-200' },
}

export default function PlayerCampaignPage() {
  const { code } = useParams<{ code: string }>()
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [character, setCharacter] = useState<Character | null>(null)
  const [fateLog, setFateLog] = useState<FateEvent[]>([])
  const [whispers, setWhispers] = useState<Whisper[]>([])
  const [loading, setLoading] = useState(true)
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'denied' | 'unsupported'>('idle')
  const [fateToast, setFateToast] = useState<FateEventType | null>(null)
  const [whisperToast, setWhisperToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const whisperToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rollHistory, setRollHistory] = useState<RollEntry[]>([])
  const [rollExpr, setRollExpr] = useState('')
  const [initiativeRequest, setInitiativeRequest] = useState<InitiativeRequest | null>(null)
  const [initiativeRollInput, setInitiativeRollInput] = useState('')
  const [initiativeSubmitting, setInitiativeSubmitting] = useState(false)
  const [levelUpModal, setLevelUpModal] = useState<{ level: number; prevLevel: number } | null>(null)
  const prevLevelRef = useRef<number | null>(null)
  const [playerTab, setPlayerTab] = useState<'character' | 'map' | 'battleMap' | 'spells' | 'rulebook' | 'quests' | 'roster'>('character')
  const [quests, setQuests] = useState<Quest[]>([])
  const [roster, setRoster] = useState<RosterSummary[]>([])
  const rosterRequestId = useRef(0)
  const [mapAccessGranted, setMapAccessGranted] = useState(false)
  const [sharedMapIds, setSharedMapIds] = useState<string[]>([])
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null)
  const [campaignMaps, setCampaignMaps] = useState<CampaignMap[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)
  const [battleMapAccessGranted, setBattleMapAccessGranted] = useState(false)
  const [sharedBattleMapIds, setSharedBattleMapIds] = useState<string[]>([])
  const [battleMapViewport, setBattleMapViewport] = useState<MapViewport | null>(null)
  const [campaignBattleMaps, setCampaignBattleMaps] = useState<BattleMap[]>([])
  const [selectedBattleMapId, setSelectedBattleMapId] = useState<string | null>(null)

  const loadCharacter = useCallback(async (cid: string) => {
    const characterId = localStorage.getItem(`character_${code.toUpperCase()}`)
    if (!characterId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('characters')
      .select()
      .eq('id', characterId)
      .eq('campaign_id', cid)
      .eq('is_active', true) // a kicked character must stop loading, not just disappear from rosters
      .single()
    if (data) setCharacter(rowToCharacter(data))
  }, [code])

  const loadFateLog = useCallback(async (cid: string, characterId: string) => {
    const res = await fetch(`/api/fate/log?campaignId=${cid}&characterId=${characterId}`)
    const data: unknown = await res.json()
    if (isFateLogResponse(data)) setFateLog(data.events)
  }, [])

  const loadWhispers = useCallback(async (characterId: string) => {
    const res = await fetch(`/api/whispers?characterId=${characterId}`)
    const data: unknown = await res.json()
    if (isWhispersResponse(data)) setWhispers(data.whispers)
  }, [])

  const loadMapAccess = useCallback(async (cid: string) => {
    const res = await fetch(`/api/world/maps?campaignId=${cid}`)
    const data: unknown = await res.json()
    if (isMapsResponse(data)) {
      setMapAccessGranted(data.mapAccessGranted)
      setSharedMapIds(data.sharedMapIds)
      setMapViewport(data.mapViewport)
      setCampaignMaps(data.maps)
    }
  }, [])

  const loadBattleMapAccess = useCallback(async (cid: string) => {
    const res = await fetch(`/api/world/battle-maps?campaignId=${cid}`)
    const data: unknown = await res.json()
    if (isBattleMapsResponse(data)) {
      setBattleMapAccessGranted(data.battleMapAccessGranted)
      setSharedBattleMapIds(data.sharedBattleMapIds)
      setBattleMapViewport(data.battleMapViewport)
      setCampaignBattleMaps(data.maps)
    }
  }, [])

  const fetchInitiativeRequest = useCallback(async (cid: string) => {
    const res = await fetch(`/api/initiative/request?campaignId=${cid}`)
    const data: unknown = await res.json()
    if (isInitiativeRequestResponse(data)) setInitiativeRequest(data.request)
  }, [])

  const fetchQuests = useCallback(async (cid: string) => {
    const res = await fetch(`/api/world/quests?campaignId=${cid}&publicOnly=true`)
    const data: unknown = await res.json()
    if (isQuestsResponse(data)) setQuests(data.quests)
  }, [])

  const fetchRoster = useCallback(async (cid: string) => {
    const requestId = ++rosterRequestId.current
    const res = await fetch(`/api/campaigns/roster-summary?campaignId=${cid}`)
    const data: unknown = await res.json()
    // Discard this response if a newer fetchRoster call has since started —
    // otherwise a slow request can resolve last and revert the roster to stale data.
    if (requestId !== rosterRequestId.current) return
    if (isRosterResponse(data)) setRoster(data.characters)
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('id').eq('code', code.toUpperCase()).single()
      if (!data) { setLoading(false); return }
      const cid = data.id as string
      setCampaignId(cid)
      await Promise.all([loadCharacter(cid), loadMapAccess(cid), loadBattleMapAccess(cid), fetchInitiativeRequest(cid), fetchQuests(cid), fetchRoster(cid)])
      setLoading(false)
    }
    void init()
  }, [code, loadCharacter, loadMapAccess, loadBattleMapAccess, fetchInitiativeRequest, fetchQuests, fetchRoster])

  // Load fate log and whispers once character is known
  useEffect(() => {
    if (!character || !campaignId) return
    void loadFateLog(campaignId, character.id)
    void loadWhispers(character.id)
  }, [character?.id, campaignId, loadFateLog, loadWhispers])

  // Detect level-up after a character update — show the level-up modal
  useEffect(() => {
    if (!character) { prevLevelRef.current = null; return }
    if (prevLevelRef.current !== null && character.level > prevLevelRef.current) {
      setLevelUpModal({ level: character.level, prevLevel: prevLevelRef.current })
    }
    prevLevelRef.current = character.level
  }, [character?.level])

  // Realtime: HP updates, fate draws (toast), fate reveals (log refresh), whispers (toast + log), map access
  useEffect(() => {
    if (!character || !campaignId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`player:${character.id}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${character.id}` },
        () => { void loadCharacter(campaignId) })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fate_events', filter: `target_character_id=eq.${character.id}` },
        payload => {
          const eventType = (payload.new as Record<string, unknown>).event_type as FateEventType
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
          setFateToast(eventType)
          toastTimerRef.current = setTimeout(() => setFateToast(null), 6000)
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fate_events', filter: `campaign_id=eq.${campaignId}` },
        () => { void loadFateLog(campaignId, character.id) })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whispers', filter: `character_id=eq.${character.id}` },
        payload => {
          const row = payload.new as Record<string, unknown>
          const whisper: Whisper = {
            id: row.id as string,
            characterId: row.character_id as string,
            message: row.message as string,
            createdAt: new Date(row.created_at as string),
          }
          setWhispers(prev => [whisper, ...prev])
          if (whisperToastTimerRef.current) clearTimeout(whisperToastTimerRef.current)
          setWhisperToast(whisper.message)
          whisperToastTimerRef.current = setTimeout(() => setWhisperToast(null), 8000)
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        payload => {
          const row = payload.new as Record<string, unknown>
          const granted = row.map_access_granted as boolean
          setMapAccessGranted(granted)
          setSharedMapIds((row.shared_map_ids as string[]) ?? [])
          setMapViewport((row.map_viewport as MapViewport | null) ?? null)
          if (!granted) setPlayerTab('character')
          // Re-fetch full maps list in case new maps were uploaded since page load
          void loadMapAccess(campaignId)

          const battleGranted = row.battle_map_access_granted as boolean
          setBattleMapAccessGranted(battleGranted)
          setSharedBattleMapIds((row.shared_battle_map_ids as string[]) ?? [])
          setBattleMapViewport((row.battle_map_viewport as MapViewport | null) ?? null)
          if (!battleGranted) setPlayerTab('character')
          // Re-fetch full battle maps list in case new maps were uploaded since page load
          void loadBattleMapAccess(campaignId)
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'initiative_requests', filter: `campaign_id=eq.${campaignId}` },
        payload => {
          const row = payload.new as Record<string, unknown>
          setInitiativeRequest({
            id: row.id as string,
            campaignId: row.campaign_id as string,
            status: row.status as 'pending' | 'resolved',
            rolls: (row.rolls as Record<string, number>) ?? {},
            createdAt: new Date(row.created_at as string),
          })
          setInitiativeRollInput('')
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'initiative_requests', filter: `campaign_id=eq.${campaignId}` },
        payload => {
          const row = payload.new as Record<string, unknown>
          if (row.status === 'resolved') {
            setInitiativeRequest(null)
          } else {
            setInitiativeRequest({
              id: row.id as string,
              campaignId: row.campaign_id as string,
              status: row.status as 'pending' | 'resolved',
              rolls: (row.rolls as Record<string, number>) ?? {},
              createdAt: new Date(row.created_at as string),
            })
          }
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'quests', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchQuests(campaignId) })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchRoster(campaignId) })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (whisperToastTimerRef.current) clearTimeout(whisperToastTimerRef.current)
    }
  }, [character?.id, campaignId, loadFateLog, loadCharacter, loadMapAccess, loadBattleMapAccess, fetchQuests, fetchRoster])

  // Register service worker and subscribe to push.
  // Always run on character load so this browser's subscription is synced to the DB —
  // the player may have previously subscribed on a different device or cleared storage.
  useEffect(() => {
    if (!character?.id) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported')
      return
    }
    void subscribeToPush(character.id, setPushStatus)
  }, [character?.id])

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading…</p>
      </main>
    )
  }

  if (!character) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-stone-400">Character not found.</p>
          <a href="/play" className="text-amber-400 hover:underline text-sm">Rejoin campaign</a>
        </div>
      </main>
    )
  }

  const hpPercent = Math.max(0, (character.currentHp / character.maxHp) * 100)
  const hpColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <main className={`bg-stone-950 text-stone-100 flex flex-col ${playerTab === 'map' || playerTab === 'battleMap' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {fateToast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm border-2 rounded-2xl px-5 py-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300 ${EVENT_TOAST[fateToast].classes}`}>
          <p className="text-xs uppercase tracking-[0.2em] opacity-60 mb-1">The fates have spoken</p>
          <p className="text-lg font-bold leading-snug">{EVENT_TOAST[fateToast].message}</p>
          <p className="text-xs opacity-50 mt-2 uppercase tracking-widest">{EVENT_LABELS[fateToast]}</p>
          <button onClick={() => setFateToast(null)} className="absolute top-3 right-4 opacity-40 hover:opacity-80 text-sm transition-opacity">✕</button>
        </div>
      )}
      {whisperToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm border-2 border-amber-700 bg-stone-950 rounded-2xl px-5 py-4 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-500 mb-1">DM Whisper</p>
          <p className="text-base text-stone-100 leading-snug">{whisperToast}</p>
          <button onClick={() => setWhisperToast(null)} className="absolute top-3 right-4 text-stone-600 hover:text-stone-400 text-sm transition-opacity">✕</button>
        </div>
      )}
      {/* Initiative roll modal */}
      {initiativeRequest?.status === 'pending' && character && (() => {
        const myRoll = initiativeRequest.rolls[character.id]
        // Show the submitted state only when we have a roll AND the user isn't editing
        const showSubmitted = myRoll !== undefined && initiativeRollInput === ''

        async function handleSubmitInitiative() {
          if (!character || !campaignId || initiativeSubmitting) return
          const roll = parseInt(initiativeRollInput, 10)
          if (isNaN(roll) || roll < 1 || roll > 30) return
          setInitiativeSubmitting(true)
          try {
            await fetch('/api/initiative/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaignId, characterId: character.id, roll }),
            })
            setInitiativeRequest(prev => prev ? { ...prev, rolls: { ...prev.rolls, [character.id]: roll } } : prev)
            setInitiativeRollInput('')
          } finally {
            setInitiativeSubmitting(false)
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="bg-stone-900 border-2 border-amber-700/60 rounded-2xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
              {showSubmitted ? (
                <>
                  <div className="text-center space-y-2">
                    <p className="text-emerald-400 text-4xl">✓</p>
                    <p className="text-xl font-bold">Roll Submitted!</p>
                    <p className="text-stone-400 text-sm">You rolled <span className="text-amber-300 font-bold font-mono text-lg">{myRoll}</span></p>
                    <p className="text-stone-500 text-xs">Waiting for the DM to start combat…</p>
                  </div>
                  <button
                    onClick={() => setInitiativeRollInput(String(myRoll))}
                    className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors py-2"
                  >
                    Change roll
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-amber-400 uppercase tracking-widest mb-1">Combat is starting!</p>
                    <p className="text-xl font-bold">Roll Initiative</p>
                    <p className="text-stone-400 text-sm mt-1">Roll a d20 and add any modifiers, then submit your total.</p>
                  </div>
                  <button
                    onClick={() => setInitiativeRollInput(String(Math.floor(Math.random() * 20) + 1))}
                    className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors text-lg"
                  >
                    🎲 Roll d20
                  </button>
                  <div className="space-y-2">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="Enter your total…"
                      value={initiativeRollInput}
                      onChange={e => setInitiativeRollInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleSubmitInitiative() }}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-center text-2xl font-bold font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => void handleSubmitInitiative()}
                      disabled={!initiativeRollInput.trim() || initiativeSubmitting}
                      className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                      {initiativeSubmitting ? 'Submitting…' : myRoll !== undefined ? 'Resubmit Roll' : 'Submit Roll'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {levelUpModal !== null && (
        <LevelUpModal
          characterName={character.characterName}
          className={character.class}
          newLevel={levelUpModal.level}
          currentSpellSlots={character.spellSlots}
          onClose={() => setLevelUpModal(null)}
          onApplySpellSlots={async (slots) => {
            await fetch('/api/characters/spell-slots', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ characterId: character.id, spellSlots: slots }),
            })
            setCharacter(prev => prev ? { ...prev, spellSlots: slots } : prev)
          }}
          onBrowseSpells={() => {
            setPlayerTab('spells')
            setLevelUpModal(null)
          }}
        />
      )}

      {/* Header */}
      <div className="shrink-0 border-b border-stone-800 px-4 pt-4 pb-0">
        <div className="max-w-sm mx-auto">
          <h1 className="text-2xl font-bold">{character.characterName}</h1>
          <p className="text-stone-400">{character.playerName} · {character.class} {character.level}</p>
          <div className="flex items-center justify-between">
            <p className="font-mono text-stone-500 text-xs mt-0.5">{code.toUpperCase()}</p>
            <button
              onClick={() => {
                localStorage.removeItem(`character_${code.toUpperCase()}`)
                window.location.href = '/play'
              }}
              className="text-xs text-stone-500 hover:text-amber-400 underline underline-offset-2 mt-0.5"
            >
              Not you? Switch character
            </button>
          </div>
          {/* Tab bar */}
          <div className="flex mt-3">
            <button
              onClick={() => setPlayerTab('character')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'character' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >Character</button>
            {mapAccessGranted && (
              <button
                onClick={() => setPlayerTab('map')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'map' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
              >Map</button>
            )}
            {battleMapAccessGranted && (
              <button
                onClick={() => setPlayerTab('battleMap')}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'battleMap' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
              >Battle Map</button>
            )}
            <button
              onClick={() => setPlayerTab('spells')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'spells' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >Spells</button>
            <button
              onClick={() => setPlayerTab('rulebook')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'rulebook' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >Rulebook</button>
            <button
              onClick={() => setPlayerTab('roster')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${playerTab === 'roster' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >Roster</button>
            <button
              onClick={() => setPlayerTab('quests')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors relative ${playerTab === 'quests' ? 'border-amber-500 text-amber-400' : 'border-transparent text-stone-500 hover:text-stone-300'}`}
            >
              Quests
              {quests.length > 0 && <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-amber-500 rounded-full" />}
            </button>
          </div>
        </div>
      </div>

      {playerTab === 'map' && mapAccessGranted && (
        <div className="flex-1 overflow-hidden">
          <PlayerMapTab
            maps={campaignMaps}
            sharedMapIds={sharedMapIds}
            mapViewport={mapViewport}
            selectedMapId={selectedMapId}
            onSelectMap={setSelectedMapId}
          />
        </div>
      )}

      {playerTab === 'battleMap' && battleMapAccessGranted && (
        <div className="flex-1 overflow-hidden">
          <PlayerBattleMapTab
            maps={campaignBattleMaps}
            sharedMapIds={sharedBattleMapIds}
            mapViewport={battleMapViewport}
            selectedMapId={selectedBattleMapId}
            onSelectMap={setSelectedBattleMapId}
          />
        </div>
      )}

      {playerTab === 'spells' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-sm mx-auto p-4">
            <SpellsTab defaultClass={character.class} />
          </div>
        </div>
      )}

      {playerTab === 'rulebook' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-sm mx-auto p-4">
            <RulebookTab />
          </div>
        </div>
      )}

      {playerTab === 'quests' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-sm mx-auto p-4">
            <PlayerQuestsTab quests={quests} />
          </div>
        </div>
      )}

      {playerTab === 'roster' && (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-sm mx-auto p-4">
            <PlayerRosterTab roster={roster} selfId={character.id} />
          </div>
        </div>
      )}

      {playerTab === 'character' && (
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-sm mx-auto p-4 space-y-6">

        {/* Push notification status */}
        {pushStatus === 'denied' && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2 text-xs text-red-400">
            Notifications blocked. Enable them in browser settings to receive fate alerts.
          </div>
        )}
        {pushStatus === 'subscribed' && (
          <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-lg px-3 py-2 text-xs text-emerald-400">
            ● Fate notifications active
          </div>
        )}

        <TokenAppearancePicker
          character={character}
          onUpdated={patch => setCharacter(prev => prev ? { ...prev, tokenImageUrl: patch.tokenImageUrl, tokenColor: patch.tokenColor } : prev)}
        />

        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-stone-400 text-sm">Hit Points</span>
            <div>
              <span className="text-3xl font-bold">{character.currentHp}</span>
              <span className="text-stone-500"> / {character.maxHp}</span>
            </div>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${hpColor}`} style={{ width: `${hpPercent}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-center">
            <p className="text-stone-400 text-xs">Armor Class</p>
            <p className="text-2xl font-bold mt-1">{character.armorClass}</p>
          </div>
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-center">
            <p className="text-stone-400 text-xs">Level</p>
            <p className="text-2xl font-bold mt-1">{character.level}</p>
          </div>
        </div>

        {/* XP progress */}
        {(() => {
          const nextXp = xpForNextLevel(character.level)
          const prevXp = XP_THRESHOLDS[character.level - 1] ?? 0
          const xpPercent = nextXp ? Math.min(100, ((character.xp - prevXp) / (nextXp - prevXp)) * 100) : 100
          return (
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 text-xs uppercase tracking-widest">Experience</span>
                <span className="text-stone-300 text-sm tabular-nums">
                  {character.xp.toLocaleString()}{nextXp ? ` / ${nextXp.toLocaleString()}` : ' (max)'}
                </span>
              </div>
              <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${xpPercent}%` }} />
              </div>
              {nextXp && (
                <p className="text-xs text-stone-600 text-right tabular-nums">
                  {(nextXp - character.xp).toLocaleString()} XP to level {character.level + 1}
                </p>
              )}
            </div>
          )
        })()}

        {/* Wallet */}
        {(character.gold > 0 || character.silver > 0 || character.copper > 0 || character.customCurrency.length > 0) && (
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-2">
            <p className="text-xs text-stone-500 uppercase tracking-widest mb-3">Wallet</p>
            {character.gold > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-sm font-medium">Gold</span>
                <span className="text-stone-100 tabular-nums font-semibold">{character.gold.toLocaleString()} gp</span>
              </div>
            )}
            {character.silver > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Silver</span>
                <span className="text-stone-100 tabular-nums font-semibold">{character.silver.toLocaleString()} sp</span>
              </div>
            )}
            {character.copper > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-orange-400 text-sm font-medium">Copper</span>
                <span className="text-stone-100 tabular-nums font-semibold">{character.copper.toLocaleString()} cp</span>
              </div>
            )}
            {character.customCurrency.map(cc => (
              <div key={cc.name} className="flex items-center justify-between">
                <span className="text-stone-300 text-sm">{cc.name}</span>
                <span className="text-stone-100 tabular-nums font-semibold">{cc.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {character.conditions.length > 0 && (
          <div className="bg-stone-900 border border-amber-900/50 rounded-xl p-3">
            <p className="text-stone-400 text-xs mb-2">Conditions</p>
            <div className="flex flex-wrap gap-2">
              {character.conditions.map(c => {
                const icon = CONDITION_ICONS[c.name.toLowerCase()]
                return (
                  <span key={c.name} className="flex items-center gap-1.5 text-xs bg-amber-900/40 text-amber-300 px-2 py-1 rounded-full">
                    {icon && <span className="text-base leading-none">{icon}</span>}
                    {c.name}{c.roundsRemaining !== null ? ` (${c.roundsRemaining}r)` : ''}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Death saves — only when downed */}
        {character.currentHp === 0 && (
          <div className="bg-stone-900 border border-red-900/50 rounded-xl p-4">
            <p className="text-xs text-red-400 uppercase tracking-widest mb-3">Death Saves</p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-500">Successes</span>
                {[0, 1, 2].map(i => (
                  <button key={i}
                    onClick={() => void updateDeathSave(character.id, 'success', character.deathSaves, setCharacter)}
                    className={`w-7 h-7 rounded-full border-2 transition-colors ${i < character.deathSaves.successes ? 'bg-emerald-500 border-emerald-400' : 'border-stone-600 bg-stone-800'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">Failures</span>
                {[0, 1, 2].map(i => (
                  <button key={i}
                    onClick={() => void updateDeathSave(character.id, 'failure', character.deathSaves, setCharacter)}
                    className={`w-7 h-7 rounded-full border-2 transition-colors ${i < character.deathSaves.failures ? 'bg-red-500 border-red-400' : 'border-stone-600 bg-stone-800'}`}
                  />
                ))}
              </div>
            </div>
            {character.deathSaves.successes >= 3 && <p className="text-emerald-400 text-sm mt-3 font-medium">You are stable.</p>}
            {character.deathSaves.failures >= 3 && <p className="text-red-400 text-sm mt-3 font-medium">You have fallen.</p>}
          </div>
        )}

        {/* Spell slots */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-stone-500 uppercase tracking-widest">Spell Slots</p>
          {character.spellSlots.length === 0 && (
            <p className="text-stone-600 text-xs">No spell slots yet — add a level below.</p>
          )}
          <div className="space-y-2">
            {character.spellSlots.map(slot => (
              <div key={slot.level} className="flex items-center gap-2">
                <span className="text-stone-500 text-xs w-10 shrink-0">Lvl {slot.level}</span>
                <div className="flex gap-1 flex-wrap flex-1">
                  {Array.from({ length: slot.total }).map((_, i) => {
                    const isUsed = i < slot.used
                    return (
                      <button key={i}
                        onClick={() => void toggleSpellSlot(character.id, slot.level, i, character.spellSlots, setCharacter)}
                        className={`w-6 h-6 rounded-full border-2 transition-colors ${isUsed ? 'border-stone-600 bg-stone-800' : 'border-violet-500 bg-violet-900/50'}`}
                      />
                    )
                  })}
                </div>
                <span className="text-xs text-stone-500 tabular-nums w-8 text-right shrink-0">{slot.total - slot.used}/{slot.total}</span>
                <button
                  onClick={() => void adjustSlotTotal(character.id, slot.level, -1, character.spellSlots, setCharacter)}
                  className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-300 text-base leading-none shrink-0"
                >−</button>
                <button
                  onClick={() => void adjustSlotTotal(character.id, slot.level, +1, character.spellSlots, setCharacter)}
                  className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-300 text-base leading-none shrink-0"
                >+</button>
                <button
                  onClick={() => void removeSlotLevel(character.id, slot.level, character.spellSlots, setCharacter)}
                  className="w-6 h-6 flex items-center justify-center text-stone-700 hover:text-red-400 text-xs transition-colors shrink-0"
                >✕</button>
              </div>
            ))}
          </div>
          <AddSlotLevelRow
            characterId={character.id}
            spellSlots={character.spellSlots}
            setCharacter={setCharacter}
          />
        </div>

        {(whispers.length > 0 || fateLog.length > 0) && (() => {
          type LogEntry =
            | { kind: 'whisper'; id: string; message: string; createdAt: Date }
            | { kind: 'fate'; id: string; eventType: FateEventType; createdAt: Date }

          const entries: LogEntry[] = [
            ...whispers.map(w => ({ kind: 'whisper' as const, id: w.id, message: w.message, createdAt: w.createdAt })),
            ...fateLog.map(e => ({ kind: 'fate' as const, id: e.id, eventType: e.eventType, createdAt: e.createdAt })),
          ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

          return (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 uppercase tracking-widest">Event Log</p>
              {entries.map(entry => (
                <div key={entry.id} className={`border rounded-lg px-3 py-2.5 flex items-start justify-between gap-3 ${
                  entry.kind === 'whisper'
                    ? 'bg-stone-900 border-amber-900/40'
                    : 'bg-stone-900 border-stone-800'
                }`}>
                  {entry.kind === 'whisper' ? (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-500 uppercase tracking-wider mb-0.5">DM Whisper</p>
                      <p className="text-sm text-stone-200 break-words">{entry.message}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-amber-400 text-sm font-medium">{EVENT_LABELS[entry.eventType]}</span>
                      <span className="text-xs text-stone-500">fate event</span>
                    </div>
                  )}
                  <span className="text-stone-600 text-xs shrink-0 mt-0.5">
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Dice roller */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-stone-500 uppercase tracking-widest">Dice Roller</p>
          <div className="flex flex-wrap gap-2">
            {([4,6,8,10,12,20,100] as const).map(d => (
              <button
                key={d}
                onClick={() => {
                  const result = Math.floor(Math.random() * d) + 1
                  setRollHistory(h => [{ label: `d${d}`, result, timestamp: new Date() }, ...h].slice(0, 20))
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg text-sm font-medium transition-colors"
              >
                d{d}
              </button>
            ))}
          </div>

          {character.abilityScores && (
            <div>
              <p className="text-xs text-stone-600 mb-1.5">Ability checks (d20 + mod)</p>
              <div className="grid grid-cols-6 gap-1.5">
                {(['str','dex','con','int','wis','cha'] as const).map(key => {
                  const score = character.abilityScores?.[key]
                  if (score == null) return null
                  const mod = Math.floor((score - 10) / 2)
                  const modStr = mod >= 0 ? `+${mod}` : `${mod}`
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        const roll = Math.floor(Math.random() * 20) + 1
                        const total = roll + mod
                        const label = `${key.toUpperCase()} (${modStr})`
                        setRollHistory(h => [{ label, result: total, timestamp: new Date() }, ...h].slice(0, 20))
                      }}
                      className="flex flex-col items-center py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
                    >
                      <span className="text-xs text-stone-400 uppercase">{key}</span>
                      <span className="text-sm font-bold font-mono">{modStr}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={rollExpr}
              onChange={e => setRollExpr(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter' || !rollExpr.trim()) return
                const result = rollExpression(rollExpr)
                setRollHistory(h => [{ label: rollExpr.trim(), result, timestamp: new Date() }, ...h].slice(0, 20))
                setRollExpr('')
              }}
              placeholder="2d6+3"
              className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-600"
            />
            <button
              onClick={() => {
                if (!rollExpr.trim()) return
                const result = rollExpression(rollExpr)
                setRollHistory(h => [{ label: rollExpr.trim(), result, timestamp: new Date() }, ...h].slice(0, 20))
                setRollExpr('')
              }}
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm font-medium transition-colors"
            >
              Roll
            </button>
          </div>
          {rollHistory.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {rollHistory.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">{r.label}</span>
                  <span className="font-bold text-amber-300 tabular-nums">{r.result}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
      )}
    </main>
  )
}

async function updateDeathSave(
  characterId: string,
  type: 'success' | 'failure',
  current: Character['deathSaves'],
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
) {
  const deathSaves = {
    successes: type === 'success' ? Math.min(3, current.successes + 1) : current.successes,
    failures: type === 'failure' ? Math.min(3, current.failures + 1) : current.failures,
  }
  await fetch('/api/characters/death-saves', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, deathSaves }),
  })
  setCharacter(prev => prev ? { ...prev, deathSaves } : prev)
}

async function toggleSpellSlot(
  characterId: string,
  level: number,
  slotIndex: number,
  currentSlots: Character['spellSlots'],
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
) {
  const spellSlots = currentSlots.map(s => {
    if (s.level !== level) return s
    const isUsed = slotIndex < s.used
    return { ...s, used: isUsed ? Math.max(0, s.used - 1) : Math.min(s.total, s.used + 1) }
  })
  await fetch('/api/characters/spell-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, spellSlots }),
  })
  setCharacter(prev => prev ? { ...prev, spellSlots } : prev)
}

async function adjustSlotTotal(
  characterId: string,
  level: number,
  delta: number,
  currentSlots: Character['spellSlots'],
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
) {
  const spellSlots = currentSlots.map(s => {
    if (s.level !== level) return s
    const newTotal = Math.max(1, Math.min(9, s.total + delta))
    return { ...s, total: newTotal, used: Math.min(s.used, newTotal) }
  })
  await fetch('/api/characters/spell-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, spellSlots }),
  })
  setCharacter(prev => prev ? { ...prev, spellSlots } : prev)
}

async function removeSlotLevel(
  characterId: string,
  level: number,
  currentSlots: Character['spellSlots'],
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>,
) {
  const spellSlots = currentSlots.filter(s => s.level !== level)
  await fetch('/api/characters/spell-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, spellSlots }),
  })
  setCharacter(prev => prev ? { ...prev, spellSlots } : prev)
}

function AddSlotLevelRow({
  characterId,
  spellSlots,
  setCharacter,
}: {
  characterId: string
  spellSlots: Character['spellSlots']
  setCharacter: React.Dispatch<React.SetStateAction<Character | null>>
}) {
  const [newLevel, setNewLevel] = React.useState(1)
  const [newTotal, setNewTotal] = React.useState(2)

  const existingLevels = spellSlots.map(s => s.level)
  const available = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => !existingLevels.includes(l))
  if (available.length === 0) return null

  const effectiveLevel = available.includes(newLevel) ? newLevel : available[0]!

  const handleAdd = async () => {
    const updated = [...spellSlots, { level: effectiveLevel, total: newTotal, used: 0 }]
      .sort((a, b) => a.level - b.level)
    await fetch('/api/characters/spell-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, spellSlots: updated }),
    })
    setCharacter(prev => prev ? { ...prev, spellSlots: updated } : prev)
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
      <span className="text-xs text-stone-600 shrink-0">Add</span>
      <select
        value={effectiveLevel}
        onChange={e => setNewLevel(Number(e.target.value))}
        className="bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-violet-600"
      >
        {available.map(l => (
          <option key={l} value={l}>Level {l}</option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={9}
        value={newTotal}
        onChange={e => setNewTotal(Math.max(1, Math.min(9, Number(e.target.value))))}
        className="w-12 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-xs text-stone-300 text-center focus:outline-none focus:border-violet-600"
      />
      <span className="text-xs text-stone-600 shrink-0">slots</span>
      <button
        onClick={() => void handleAdd()}
        className="ml-auto px-3 py-1 bg-violet-900/60 hover:bg-violet-800/60 border border-violet-700/50 rounded text-xs text-violet-300 transition-colors"
      >
        + Add
      </button>
    </div>
  )
}

async function subscribeToPush(
  characterId: string,
  setStatus: (s: 'idle' | 'subscribed' | 'denied' | 'unsupported') => void,
) {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // If this browser already has an active push subscription, sync it to the DB
    // so whispers go to the right device (not a stale subscription from another browser).
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, subscription: existing.toJSON() }),
      })
      setStatus('subscribed')
      return
    }

    // No existing subscription — request permission and create one.
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setStatus('denied'); return }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, subscription: subscription.toJSON() }),
    })

    setStatus('subscribed')
  } catch {
    setStatus('denied')
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i)
  return buffer
}

function isFateLogResponse(v: unknown): v is { events: FateEvent[] } {
  return typeof v === 'object' && v !== null && 'events' in v && Array.isArray((v as Record<string, unknown>).events)
}

function isWhispersResponse(v: unknown): v is { whispers: Whisper[] } {
  return typeof v === 'object' && v !== null && 'whispers' in v && Array.isArray((v as Record<string, unknown>).whispers)
}

function isMapsResponse(v: unknown): v is { maps: CampaignMap[]; mapAccessGranted: boolean; sharedMapIds: string[]; mapViewport: MapViewport | null } {
  return typeof v === 'object' && v !== null && 'maps' in v && Array.isArray((v as Record<string, unknown>).maps)
}

function isBattleMapsResponse(v: unknown): v is { maps: BattleMap[]; battleMapAccessGranted: boolean; sharedBattleMapIds: string[]; battleMapViewport: MapViewport | null } {
  return typeof v === 'object' && v !== null && 'maps' in v && Array.isArray((v as Record<string, unknown>).maps)
}

function isInitiativeRequestResponse(v: unknown): v is { request: InitiativeRequest | null } {
  return typeof v === 'object' && v !== null && 'request' in v
}

function isQuestsResponse(v: unknown): v is { quests: Quest[] } {
  return typeof v === 'object' && v !== null && 'quests' in v && Array.isArray((v as Record<string, unknown>).quests)
}

function isRosterResponse(v: unknown): v is { characters: RosterSummary[] } {
  return typeof v === 'object' && v !== null && 'characters' in v && Array.isArray((v as Record<string, unknown>).characters)
}

// ── Player Roster Tab ──────────────────────────────────────────────────────────

function PlayerRosterTab({ roster, selfId }: { roster: RosterSummary[]; selfId: string }) {
  if (roster.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-stone-500 text-sm">No party members yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500 uppercase tracking-widest">Party ({roster.length})</p>
      {roster.map(c => {
        const hpPercent = c.maxHp > 0 ? Math.max(0, (c.currentHp / c.maxHp) * 100) : 0
        const hpColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
        return (
          <div key={c.id} className={`bg-stone-900 border rounded-xl p-3.5 space-y-2 ${c.id === selfId ? 'border-amber-700/50' : 'border-stone-800'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{c.characterName}</p>
                <p className="text-xs text-stone-500 truncate">{c.playerName}</p>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums shrink-0">
                {c.currentHp}<span className="text-stone-500"> / {c.maxHp}</span>
              </span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${hpColor}`} style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Player Quests Tab ──────────────────────────────────────────────────────────

const PLAYER_DIFFICULTY_LABELS = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Deadly']
const PLAYER_DIFFICULTY_COLORS = ['', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-orange-500', 'bg-red-500']
const PLAYER_DIFFICULTY_TEXT   = ['', 'text-emerald-400', 'text-sky-400', 'text-amber-400', 'text-orange-400', 'text-red-400']

function PlayerQuestsTab({ quests }: { quests: Quest[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (quests.length === 0) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-stone-500 text-sm">No active quests yet.</p>
        <p className="text-stone-600 text-xs">Your DM will post quests here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500 uppercase tracking-widest">Active Quests ({quests.length})</p>
      {quests.map(q => {
        const isExpanded = expandedId === q.id
        return (
          <div key={q.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : q.id)}
              className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <p className="font-semibold text-sm leading-snug">{q.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.isOptional ? 'bg-stone-800 text-stone-400' : 'bg-red-950/50 text-red-400 border border-red-800/40'}`}>
                    {q.isOptional ? 'Optional' : 'Required'}
                  </span>
                </div>
                {/* Difficulty gauge */}
                <div className="flex items-center gap-1.5">
                  {[1,2,3,4,5].map(d => (
                    <div key={d} className={`w-3 h-3 rounded-sm ${d <= q.difficulty ? PLAYER_DIFFICULTY_COLORS[q.difficulty] : 'bg-stone-800'}`} />
                  ))}
                  <span className={`text-xs ml-1 ${PLAYER_DIFFICULTY_TEXT[q.difficulty] ?? ''}`}>
                    {PLAYER_DIFFICULTY_LABELS[q.difficulty] ?? ''}
                  </span>
                </div>
              </div>
              <span className="text-stone-600 text-xs mt-0.5 shrink-0">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-stone-800/50 pt-3 space-y-2.5">
                {q.questType && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Quest Type</span>
                    <span className="text-sm text-stone-300">{q.questType}</span>
                  </div>
                )}
                {q.giver && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Quest Giver</span>
                    <span className="text-sm text-stone-300">{q.giver}</span>
                  </div>
                )}
                {q.objective && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Objective</span>
                    <span className="text-sm text-stone-200 font-medium">{q.objective}</span>
                  </div>
                )}
                {q.location && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Location</span>
                    <span className="text-sm text-stone-300">{q.location}</span>
                  </div>
                )}
                {q.complications && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Complication</span>
                    <span className="text-sm text-stone-400 italic">{q.complications}</span>
                  </div>
                )}
                {q.reward && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Reward</span>
                    <span className="text-sm text-amber-300 font-medium">{q.reward}</span>
                  </div>
                )}
                {q.description && (
                  <div className="flex gap-3">
                    <span className="text-xs text-stone-500 w-24 shrink-0 pt-0.5">Notes</span>
                    <span className="text-sm text-stone-400 leading-relaxed">{q.description}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Player Map Tab ─────────────────────────────────────────────────────────────

function PlayerMapTab({
  maps,
  sharedMapIds,
  mapViewport,
  selectedMapId,
  onSelectMap,
}: {
  maps: CampaignMap[]
  sharedMapIds: string[]
  mapViewport: MapViewport | null
  selectedMapId: string | null
  onSelectMap: (id: string) => void
}) {
  const sharedMaps = maps.filter(m => sharedMapIds.includes(m.id))

  const activeId = selectedMapId && sharedMapIds.includes(selectedMapId)
    ? selectedMapId
    : sharedMaps[0]?.id ?? null

  const activeMap = sharedMaps.find(m => m.id === activeId) ?? null
  const activeViewport = activeMap && mapViewport?.mapId === activeMap.id ? mapViewport : null

  if (sharedMaps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-stone-500 text-sm">
        No maps shared yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map selector (only show if more than 1 shared map) */}
      {sharedMaps.length > 1 && (
        <div className="flex gap-2 px-4 py-2 border-b border-stone-800 overflow-x-auto">
          {sharedMaps.map(m => (
            <button
              key={m.id}
              onClick={() => onSelectMap(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                m.id === activeId
                  ? 'bg-amber-900/60 border-amber-700 text-amber-300'
                  : 'border-stone-700 text-stone-500 hover:text-stone-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Map viewer */}
      <div className="flex-1 overflow-hidden">
        {activeMap && <MapViewer map={activeMap} viewport={activeViewport} />}
      </div>
    </div>
  )
}

// ── Player Battle Map Tab ──────────────────────────────────────────────────────

function PlayerBattleMapTab({
  maps,
  sharedMapIds,
  mapViewport,
  selectedMapId,
  onSelectMap,
}: {
  maps: BattleMap[]
  sharedMapIds: string[]
  mapViewport: MapViewport | null
  selectedMapId: string | null
  onSelectMap: (id: string) => void
}) {
  const sharedMaps = maps.filter(m => sharedMapIds.includes(m.id))

  const activeId = selectedMapId && sharedMapIds.includes(selectedMapId)
    ? selectedMapId
    : sharedMaps[0]?.id ?? null

  const activeMap = sharedMaps.find(m => m.id === activeId) ?? null

  if (sharedMaps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-stone-500 text-sm">
        No battle maps shared yet.
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map selector (only show if more than 1 shared map) */}
      {sharedMaps.length > 1 && (
        <div className="flex gap-2 px-4 py-2 border-b border-stone-800 overflow-x-auto">
          {sharedMaps.map(m => (
            <button
              key={m.id}
              onClick={() => onSelectMap(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                m.id === activeId
                  ? 'bg-amber-900/60 border-amber-700 text-amber-300'
                  : 'border-stone-700 text-stone-500 hover:text-stone-300'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Map viewer */}
      <div className="flex-1 overflow-hidden">
        {activeMap && <PlayerBattleMapView battleMap={activeMap} />}
      </div>
    </div>
  )
}

function MapViewer({ map, viewport }: { map: CampaignMap; viewport: MapViewport | null }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const [imgNatural, setImgNatural] = useState({ w: 1, h: 1 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setContainerSize({ w: r.width, h: r.height })
    return () => ro.disconnect()
  }, [])

  if (!viewport) {
    return (
      <div ref={containerRef} className="w-full h-full overflow-hidden bg-stone-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={map.imageUrl}
          alt={map.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top left' }}
          onLoad={e => {
            const img = e.currentTarget
            setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
          }}
        />
      </div>
    )
  }

  // Bounding box of the selected region in normalized coords
  let xMin = 0, xMax = 1, yMin = 0, yMax = 1
  if (viewport.shape === 'rect') {
    xMin = viewport.x!; yMin = viewport.y!
    xMax = xMin + viewport.width!; yMax = yMin + viewport.height!
  } else if (viewport.shape === 'circle') {
    // r is normalized to image width; convert ry for aspect ratio
    const rX = viewport.r!
    const rY = imgNatural.h > 0 ? viewport.r! * (imgNatural.w / imgNatural.h) : viewport.r!
    xMin = viewport.cx! - rX; xMax = viewport.cx! + rX
    yMin = viewport.cy! - rY; yMax = viewport.cy! + rY
  } else if (viewport.shape === 'polygon' && viewport.points && viewport.points.length > 0) {
    const xs = viewport.points.map(p => p.x)
    const ys = viewport.points.map(p => p.y)
    xMin = Math.min(...xs); xMax = Math.max(...xs)
    yMin = Math.min(...ys); yMax = Math.max(...ys)
  }

  xMin = Math.max(0, xMin); yMin = Math.max(0, yMin)
  xMax = Math.min(1, xMax); yMax = Math.min(1, yMax)

  const bboxW = Math.max(0.01, xMax - xMin)
  const bboxH = Math.max(0.01, yMax - yMin)
  const cW = containerSize.w || 1
  const cH = containerSize.h || 1

  // Scale image so bbox fills container
  const scaleX = cW / (bboxW * imgNatural.w)
  const scaleY = cH / (bboxH * imgNatural.h)
  const scale = Math.min(scaleX, scaleY)

  const scaledW = imgNatural.w * scale
  const scaledH = imgNatural.h * scale

  // Center the bbox in the container
  const imgLeft = -xMin * scaledW + (cW - bboxW * scaledW) / 2
  const imgTop = -yMin * scaledH + (cH - bboxH * scaledH) / 2

  // Clip path in container-relative pixel coords
  let clipPath = ''
  if (viewport.shape === 'rect') {
    const top = Math.max(0, yMin * scaledH + imgTop)
    const left = Math.max(0, xMin * scaledW + imgLeft)
    const right = Math.max(0, cW - (xMax * scaledW + imgLeft))
    const bottom = Math.max(0, cH - (yMax * scaledH + imgTop))
    clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`
  } else if (viewport.shape === 'circle') {
    const cx = viewport.cx! * scaledW + imgLeft
    const cy = viewport.cy! * scaledH + imgTop
    const r = viewport.r! * scaledW
    clipPath = `circle(${r}px at ${cx}px ${cy}px)`
  } else if (viewport.shape === 'polygon' && viewport.points) {
    const pts = viewport.points.map(p => `${p.x * scaledW + imgLeft}px ${p.y * scaledH + imgTop}px`)
    clipPath = `polygon(${pts.join(', ')})`
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-stone-950 overflow-hidden relative"
      style={{ clipPath }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={map.imageUrl}
        alt={map.name}
        style={{
          position: 'absolute',
          width: scaledW,
          height: scaledH,
          left: imgLeft,
          top: imgTop,
          userSelect: 'none',
        }}
        draggable={false}
        onLoad={e => {
          const img = e.currentTarget
          setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
        }}
      />
    </div>
  )
}

function rowToCharacter(row: Record<string, unknown>): Character {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    playerName: row.player_name as string,
    characterName: row.character_name as string,
    class: row.class as string,
    race: (row.race as string) ?? null,
    background: (row.background as string) ?? null,
    level: row.level as number,
    xp: (row.xp as number) ?? 0,
    maxHp: row.max_hp as number,
    currentHp: row.current_hp as number,
    armorClass: row.armor_class as number,
    speed: (row.speed as number) ?? null,
    passivePerception: (row.passive_perception as number) ?? null,
    abilityScores: (row.ability_scores as Character['abilityScores']) ?? null,
    personalityTraits: (row.personality_traits as string) ?? null,
    ideals: (row.ideals as string) ?? null,
    bonds: (row.bonds as string) ?? null,
    flaws: (row.flaws as string) ?? null,
    backstory: (row.backstory as string) ?? null,
    deathSaves: (row.death_saves as Character['deathSaves']) ?? { successes: 0, failures: 0 },
    spellSlots: (row.spell_slots as Character['spellSlots']) ?? [],
    conditions: (row.conditions as Character['conditions']) ?? [],
    loot: (row.loot as Character['loot']) ?? [],
    gold: (row.gold as number) ?? 0,
    silver: (row.silver as number) ?? 0,
    copper: (row.copper as number) ?? 0,
    customCurrency: (row.custom_currency as CustomCurrencyEntry[]) ?? [],
    pushSubscription: (row.push_subscription as Character['pushSubscription']) ?? null,
    isActive: row.is_active as boolean,
    tokenImageUrl: (row.token_image_url as string) ?? null,
    tokenStoragePath: (row.token_storage_path as string) ?? null,
    tokenColor: (row.token_color as string) ?? '#b45309',
    createdAt: new Date(row.created_at as string),
  }
}
