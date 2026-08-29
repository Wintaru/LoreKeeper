'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Character, FateEvent, FateEventType, CombatSession, Condition, DeathSaves, Npc, Location, SessionNote, InventoryItem, LootItem, NpcRelationship, CustomTable, CustomCurrencyEntry, MonsterGroup, Monster, DamageType, ConditionImmunityType, EncounterDifficulty, CampaignMap, BattleMap, MapViewport, MapType, InitiativeRequest, Quest } from '@/types'
import { EncounterEngine } from '@/engines/encounter/EncounterEngine'
import { EvaluateEncounterRequest } from '@/engines/encounter/EncounterEngineRequests'
import { EvaluateEncounterResponse } from '@/engines/encounter/EncounterEngineResponses'
import { HandlerResolverBuilder } from '@/common/resolver/HandlerResolverBuilder'
import { EvaluateEncounterHandler } from '@/engines/encounter/handlers/EvaluateEncounterHandler'
import { SpellsTab } from '@/components/SpellsTab'
import { RulebookTab } from '@/components/RulebookTab'
import { BattleMapEditor } from '@/components/battlemap/BattleMapEditor'
import { MulticlassPanel } from '@/components/MulticlassPanel'
import { FeaturesTab } from '@/components/FeaturesTab'
import { XP_THRESHOLDS, xpToLevel, xpForNextLevel, proficiencyBonusForLevel } from '@/data/leveling'
import { resolveClasses, formatClassLine } from '@/data/multiclass'

type Tab = 'roster' | 'combat' | 'fate' | 'world' | 'encounter' | 'maps' | 'battleMaps' | 'spells' | 'rulebook'
type WorldTab = 'npcs' | 'locations' | 'inventory' | 'log' | 'tables' | 'quests'


const BUILT_IN_TABLES: Record<string, { label: string; entries: string[] }> = {
  names: { label: 'Fantasy Names', entries: ['Aelindra','Borin','Caelum','Dorvak','Elenara','Fendrel','Galindra','Halgrim','Ilyana','Jorvek','Kira','Lundak','Mirela','Norgrim','Opalind','Pyra','Quelara','Rodvar','Silvara','Thorin','Ulindra','Varek','Windara','Xandrel','Yelara','Zorvak'] },
  weather: { label: 'Weather', entries: ['Clear skies','Partly cloudy','Overcast','Light rain','Heavy rain','Thunderstorm','Dense fog','Light snow','Blizzard','Scorching heat','Gentle breeze','Strong winds','Hailstorm','Sleet','Magical aurora'] },
  encounters: { label: 'Encounter Hooks', entries: ['A merchant is being robbed in broad daylight','An old woman offers a job "too dangerous for adventurers"','Strange lights in the abandoned tower to the north','The innkeeper\'s daughter has gone missing','A wounded soldier stumbles in with no memory','A letter addressed to the party arrives by raven','The local temple is under quarantine','A cart of goods abandoned on the road','Wanted posters bear a resemblance to the party','A traveling carnival arrived overnight','A child claims to have seen a dragon','The road ahead is blocked by a collapsed bridge'] },
  loot: { label: 'Loot', entries: ['2d10 gold pieces','A silver ring (25 gp)','Potion of Healing','A torn map fragment','1d6 gems worth 10 gp each','A mysterious sealed letter','Masterwork longsword','An ivory figurine (50 gp)','Spell scroll (level 1)','A cursed trinket','A pouch of exotic spices (15 gp)','A set of loaded dice'] },
}

type RollEntry = { label: string; result: number | string; timestamp: Date }

const EVENT_TYPES: { value: FateEventType; label: string; description: string }[] = [
  { value: 'attack',   label: 'Attack',   description: 'Someone is targeted by danger' },
  { value: 'curse',    label: 'Curse',    description: 'A dark power takes hold' },
  { value: 'windfall', label: 'Windfall', description: 'Fortune unexpectedly smiles' },
  { value: 'betrayal', label: 'Betrayal', description: 'Trust is about to shatter' },
  { value: 'mystery',  label: 'Mystery',  description: 'The fates remain cryptic' },
]

const encounterEngine = new EncounterEngine(
  new HandlerResolverBuilder().register(EvaluateEncounterRequest, new EvaluateEncounterHandler()).build()
)

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
const STANDARD_CONDITIONS = Object.keys(CONDITION_ICONS)

// The DM PIN is written to sessionStorage (keyed by campaign code) at
// create/rejoin/import time. Every DM-only mutation route now requires it —
// read it directly from the URL rather than prop-drilling it through every
// tab/card component in this file.
function getDmPin(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const match = window.location.pathname.match(/\/dm\/campaign\/([^/]+)/)
  if (!match) return undefined
  return sessionStorage.getItem(`dm_pin_${match[1].toUpperCase()}`) ?? undefined
}

function clearStaleDmPin(): void {
  if (typeof window === 'undefined') return
  const match = window.location.pathname.match(/\/dm\/campaign\/([^/]+)/)
  if (!match) return
  sessionStorage.removeItem(`dm_pin_${match[1].toUpperCase()}`)
}

export default function DmControlPanel() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('roster')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [combatSession, setCombatSession] = useState<CombatSession | null>(null)
  const [initiativeRequest, setInitiativeRequest] = useState<InitiativeRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDice, setShowDice] = useState(false)
  const [rollHistory, setRollHistory] = useState<RollEntry[]>([])
  const [monsterGroups, setMonsterGroups] = useState<MonsterGroup[]>([])
  const [encounterDifficulty, setEncounterDifficulty] = useState<EncounterDifficulty | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const fetchRoster = useCallback(async (cid: string) => {
    const dmPin = getDmPin()
    const res = await fetch(`/api/campaigns/roster?campaignId=${cid}&dmPin=${encodeURIComponent(dmPin ?? '')}`)
    if (res.status === 401) { clearStaleDmPin(); router.push('/dm/rejoin'); return }
    const data: unknown = await res.json()
    if (isRosterResponse(data)) setCharacters(data.characters)
  }, [router])

  const fetchCombatSession = useCallback(async (cid: string) => {
    const dmPin = getDmPin()
    const res = await fetch(`/api/combat/session?campaignId=${cid}&dmPin=${encodeURIComponent(dmPin ?? '')}`)
    const data: unknown = await res.json()
    if (isCombatSessionResponse(data)) setCombatSession(data.session)
  }, [])

  const fetchInitiativeRequest = useCallback(async (cid: string) => {
    const res = await fetch(`/api/initiative/request?campaignId=${cid}`)
    const data: unknown = await res.json()
    if (isInitiativeRequestResponse(data)) setInitiativeRequest(data.request)
  }, [])

  useEffect(() => {
    async function init() {
      if (!getDmPin()) { clearStaleDmPin(); router.push('/dm/rejoin'); return }
      const supabase = createClient()
      const { data } = await supabase.from('campaigns').select('id').eq('code', code.toUpperCase()).single()
      if (!data) { setLoading(false); return }
      const cid = data.id as string
      setCampaignId(cid)
      await Promise.all([fetchRoster(cid), fetchCombatSession(cid), fetchInitiativeRequest(cid)])
      setLoading(false)
    }
    void init()
  }, [code, router, fetchRoster, fetchCombatSession, fetchInitiativeRequest])

  useEffect(() => {
    if (monsterGroups.length === 0 || characters.length === 0) { setEncounterDifficulty(null); return }
    void encounterEngine.evaluate(new EvaluateEncounterRequest(monsterGroups, characters)).then(res => {
      const r = res as EvaluateEncounterResponse
      if (r.success && r.difficulty) setEncounterDifficulty(r.difficulty)
    })
  }, [monsterGroups, characters])

  useEffect(() => {
    if (!campaignId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`dm:${campaignId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'characters', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchRoster(campaignId) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'combat_sessions', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchCombatSession(campaignId) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combat_sessions', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchCombatSession(campaignId) })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'initiative_requests', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchInitiativeRequest(campaignId) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'initiative_requests', filter: `campaign_id=eq.${campaignId}` },
        () => { void fetchInitiativeRequest(campaignId) })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [campaignId, fetchRoster, fetchCombatSession, fetchInitiativeRequest])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tabs: Tab[] = ['roster', 'combat', 'fate', 'world', 'encounter', 'maps', 'battleMaps', 'spells', 'rulebook']
      if (e.key >= '1' && e.key <= '9') {
        setTab(tabs[parseInt(e.key, 10) - 1])
      } else if (e.key === 'd' || e.key === 'D') {
        setShowDice(v => !v)
      } else if (e.key === '?') {
        setShowShortcuts(v => !v)
      } else if (e.key === 'Escape') {
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center">
        <p className="text-stone-400">Loading…</p>
      </main>
    )
  }

  const TAB_LABELS: Record<Tab, string> = { roster: 'Roster', combat: 'Combat', fate: 'Fate Engine', world: 'World', encounter: 'Encounter', maps: 'Maps', battleMaps: 'Battle Maps', spells: 'Spells', rulebook: 'Rulebook' }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="border-b border-stone-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/lorekeeper-logo.png" alt="" width={36} height={36} className="opacity-90" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">DM Panel</h1>
            <p className="text-stone-400 font-mono text-xs">{code.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {combatSession && (
            <span className="text-xs text-red-400 bg-red-950/50 border border-red-900/50 px-2 py-1 rounded animate-pulse">
              ⚔ R{combatSession.roundNumber}
            </span>
          )}
          <button onClick={() => setShowDice(v => !v)}
            className={`text-lg px-2 py-1 rounded transition-colors ${showDice ? 'text-amber-400 bg-amber-950/40' : 'text-stone-500 hover:text-stone-300'}`}
            title="Dice roller">🎲</button>
          {campaignId && (
            <a
              href={`/api/campaigns/export?campaignId=${campaignId}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`}
              className="text-sm font-bold w-7 h-7 flex items-center justify-center rounded border border-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
              title="Export campaign packet (.zip)"
            >⬇</a>
          )}
          <button
            onClick={() => setShowShortcuts(v => !v)}
            className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded border transition-colors ${showShortcuts ? 'text-amber-400 bg-amber-950/40 border-amber-700/50' : 'text-stone-500 hover:text-stone-300 border-stone-700'}`}
            title="Keyboard shortcuts (?)">?</button>
          <span className="text-xs text-stone-500 bg-stone-900 px-2 py-1 rounded">
            {characters.length} player{characters.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="border-b border-stone-800 flex overflow-x-auto">
        {(['roster', 'combat', 'fate', 'world', 'encounter', 'maps', 'battleMaps', 'spells', 'rulebook'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              tab === t
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {showDice && (
        <DicePanel
          history={rollHistory}
          onRoll={entry => setRollHistory(prev => [entry, ...prev].slice(0, 20))}
        />
      )}

      <div className="p-4 max-w-2xl mx-auto">
        {tab === 'roster' && <RosterTab characters={characters} code={code} onRosterRefresh={() => void fetchRoster(campaignId!)} />}
        {tab === 'combat' && campaignId && (
          <CombatTab
            campaignId={campaignId}
            characters={characters}
            session={combatSession}
            onSessionChange={setCombatSession}
            onRosterRefresh={() => void fetchRoster(campaignId)}
            initiativeRequest={initiativeRequest}
            onInitiativeRequestChange={setInitiativeRequest}
          />
        )}
        {tab === 'fate' && campaignId && (
          <FateTab campaignId={campaignId} characters={characters} />
        )}
        {tab === 'world' && campaignId && (
          <WorldTab campaignId={campaignId} characters={characters} />
        )}
        {tab === 'encounter' && (
          <EncounterTab
            characters={characters}
            monsterGroups={monsterGroups}
            difficulty={encounterDifficulty}
            onGroupsChange={setMonsterGroups}
          />
        )}
        {tab === 'maps' && campaignId && (
          <MapsTab campaignId={campaignId} />
        )}
        {tab === 'battleMaps' && campaignId && (
          <BattleMapsTab campaignId={campaignId} characters={characters} />
        )}
        {tab === 'spells' && <SpellsTab />}
        {tab === 'rulebook' && <RulebookTab />}
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-stone-100">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-stone-500 hover:text-stone-300 text-lg leading-none">✕</button>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Tabs</p>
              {(['roster', 'combat', 'fate', 'world', 'encounter', 'maps', 'battleMaps', 'spells', 'rulebook'] as Tab[]).map((t, i) => (
                <div key={t} className="flex items-center text-sm">
                  <kbd className="bg-stone-800 border border-stone-700 text-stone-300 px-2 py-0.5 rounded text-xs font-mono w-6 text-center shrink-0">{i + 1}</kbd>
                  <span className="text-stone-400 ml-3">{TAB_LABELS[t]}</span>
                </div>
              ))}
              <div className="border-t border-stone-800 my-3" />
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Actions</p>
              {([
                { key: 'D', desc: 'Toggle dice roller' },
                { key: 'N', desc: 'Next turn (combat)' },
                { key: '?', desc: 'Toggle this panel' },
                { key: 'Esc', desc: 'Close panels' },
              ] as { key: string; desc: string }[]).map(({ key, desc }) => (
                <div key={key} className="flex items-center text-sm">
                  <kbd className="bg-stone-800 border border-stone-700 text-stone-300 px-2 py-0.5 rounded text-xs font-mono min-w-[1.5rem] text-center shrink-0">{key}</kbd>
                  <span className="text-stone-400 ml-3">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ── Roster Tab ────────────────────────────────────────────────────────────────

function RosterTab({ characters, code, onRosterRefresh }: { characters: Character[]; code: string; onRosterRefresh: () => void }) {
  if (characters.length === 0) {
    return (
      <div className="text-center py-16 text-stone-500">
        <p className="text-lg">No players yet</p>
        <p className="text-sm mt-1">Share the campaign code to get started</p>
        <p className="font-mono text-2xl font-bold text-amber-400 mt-4">{code.toUpperCase()}</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {characters.map(c => <CharacterCard key={c.id} character={c} onRefresh={onRosterRefresh} />)}
    </div>
  )
}

function CharacterCard({ character: c, onRefresh }: { character: Character; onRefresh: () => void }) {
  const hpPercent = Math.max(0, (c.currentHp / c.maxHp) * 100)
  const hpColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
  // `c.level` is the authoritative total (the sum of the per-class levels).
  // `earnedLevel` is what the XP total alone would buy — the two can differ
  // while the DM has yet to assign an earned level to a class.
  const classes = resolveClasses(c.classes, c.class, c.level)
  const level = c.level
  const earnedLevel = xpToLevel(c.xp)
  const nextXp = xpForNextLevel(earnedLevel)
  const [xpInput, setXpInput] = useState('')
  const [whisperText, setWhisperText] = useState('')
  const [showWhisper, setShowWhisper] = useState(false)
  const [whisperSent, setWhisperSent] = useState(false)
  const [whisperError, setWhisperError] = useState(false)
  const [confirmKick, setConfirmKick] = useState(false)
  const [showStatEdit, setShowStatEdit] = useState(false)
  const [showConditions, setShowConditions] = useState(false)
  const [showFightingStyle, setShowFightingStyle] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)
  const [maxHpInput, setMaxHpInput] = useState(String(c.maxHp))
  const [currentHpInput, setCurrentHpInput] = useState(String(c.currentHp))
  const [acInput, setAcInput] = useState(String(c.armorClass))
  const [speedInput, setSpeedInput] = useState(c.speed !== null ? String(c.speed) : '')
  const [perceptionInput, setPerceptionInput] = useState(c.passivePerception !== null ? String(c.passivePerception) : '')

  async function handleSaveStats() {
    const maxHp = parseInt(maxHpInput, 10)
    const currentHp = Math.min(parseInt(currentHpInput, 10), maxHp)
    const armorClass = parseInt(acInput, 10)
    if (isNaN(maxHp) || isNaN(currentHp) || isNaN(armorClass)) return
    const speed = speedInput.trim() === '' ? null : parseInt(speedInput, 10)
    const passivePerception = perceptionInput.trim() === '' ? null : parseInt(perceptionInput, 10)
    if ((speed !== null && isNaN(speed)) || (passivePerception !== null && isNaN(passivePerception))) return
    await fetch('/api/characters/stats', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: c.id, maxHp, currentHp, armorClass, speed, passivePerception, dmPin: getDmPin() }),
    })
    setShowStatEdit(false)
    onRefresh()
  }

  async function handleKick() {
    await fetch('/api/characters/kick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: c.id, dmPin: getDmPin() }),
    })
    onRefresh()
  }

  async function handleAwardXp() {
    const amount = parseInt(xpInput, 10)
    if (!amount) return
    await fetch('/api/characters/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: c.id, xpToAdd: amount, dmPin: getDmPin() }),
    })
    setXpInput(''); onRefresh()
  }

  async function handleWhisper() {
    if (!whisperText.trim()) return
    const res = await fetch('/api/push/whisper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: c.id, message: whisperText.trim(), dmPin: getDmPin() }),
    })
    if (res.ok) {
      setWhisperText(''); setWhisperSent(true); setWhisperError(false)
      setTimeout(() => { setWhisperSent(false); setShowWhisper(false) }, 2000)
    } else {
      setWhisperError(true)
      setTimeout(() => setWhisperError(false), 3000)
    }
  }

  async function handleToggleCondition(name: string) {
    const isActive = c.conditions.some(cond => cond.name.toLowerCase() === name)
    const newConditions = isActive
      ? c.conditions.filter(cond => cond.name.toLowerCase() !== name)
      : [...c.conditions, { name: name.charAt(0).toUpperCase() + name.slice(1), roundsRemaining: null }]
    await fetch('/api/characters/conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: c.id, conditions: newConditions, dmPin: getDmPin() }),
    })
    onRefresh()
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{c.characterName}</p>
          <p className="text-stone-400 text-sm">{c.playerName} · {formatClassLine(classes)}</p>
          <p className="text-stone-600 text-xs mt-0.5">
            Level {level} · Proficiency +{proficiencyBonusForLevel(level)}
            {classes.length > 1 && <span className="text-violet-500/80"> · Multiclass</span>}
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <span className="text-lg font-bold">{c.currentHp}</span>
            <span className="text-stone-500 text-sm"> / {c.maxHp} HP</span>
          </div>
          {confirmKick ? (
            <div className="flex gap-1">
              <button onClick={() => void handleKick()}
                className="text-xs bg-red-800 hover:bg-red-700 text-red-200 px-2 py-1 rounded transition-colors">
                Kick
              </button>
              <button onClick={() => setConfirmKick(false)}
                className="text-xs text-stone-500 hover:text-stone-300 px-2 py-1 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmKick(true)}
              className="text-stone-700 hover:text-red-500 text-xs transition-colors mt-1"
              title="Kick player">
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="flex items-center gap-3 text-sm text-stone-400 flex-wrap">
        <span>AC {c.armorClass}</span>
        {c.speed !== null && <span>{c.speed} ft</span>}
        {c.passivePerception !== null && <span title="Passive Perception">Perc {c.passivePerception}</span>}
        {c.currentHp === 0 && c.deathSaves.failures >= 3
          ? <span title="Dead" className="text-base leading-none">💀</span>
          : c.currentHp === 0
            ? <span title={`Downed — ${c.deathSaves.successes}S / ${c.deathSaves.failures}F`} className="text-red-400 text-xs">💀 {c.deathSaves.successes}S / {c.deathSaves.failures}F</span>
            : null}
        {c.conditions.map(cond => {
          const icon = CONDITION_ICONS[cond.name.toLowerCase()]
          return (
            <span key={cond.name} title={`${cond.name}${cond.roundsRemaining !== null ? ` (${cond.roundsRemaining}r)` : ''}`}
              className="text-base leading-none cursor-default select-none">
              {icon ?? <span className="text-amber-400 text-xs">{cond.name}</span>}
            </span>
          )
        })}
        {c.pushSubscription && <span className="text-emerald-600 text-xs">● push</span>}
      </div>

      {/* XP */}
      <div className="border-t border-stone-800/50 pt-3 space-y-2">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{c.xp.toLocaleString()} XP · earns level {earnedLevel}</span>
          {nextXp && <span>{(nextXp - c.xp).toLocaleString()} to next level</span>}
        </div>
        {nextXp && (
          <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-600 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((c.xp - XP_THRESHOLDS[earnedLevel - 1]) / (nextXp - XP_THRESHOLDS[earnedLevel - 1])) * 100)}%` }} />
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="+/- XP" value={xpInput}
            onChange={e => setXpInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAwardXp() }}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-violet-500" />
          <button onClick={() => void handleAwardXp()}
            className="bg-violet-800 hover:bg-violet-700 text-violet-100 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            {parseInt(xpInput, 10) < 0 ? '−XP' : '+XP'}
          </button>
          {c.pushSubscription && (
            <button onClick={() => setShowWhisper(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showWhisper ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500 hover:text-stone-300'}`}>
              Whisper
            </button>
          )}
        </div>
        {showWhisper && (
          <div className="flex gap-2">
            <input placeholder="Secret message…" value={whisperText}
              onChange={e => setWhisperText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void handleWhisper() }}
              className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500" />
            <button onClick={() => void handleWhisper()}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${whisperSent ? 'bg-emerald-800 text-emerald-200' : whisperError ? 'bg-red-900 text-red-300' : 'bg-amber-700 hover:bg-amber-600 text-white'}`}>
              {whisperSent ? 'Sent!' : whisperError ? 'Failed' : 'Send'}
            </button>
          </div>
        )}
      </div>

      {/* Edit stats */}
      <div className="border-t border-stone-800/50 pt-3">
        {showStatEdit ? (
          <div className="space-y-2">
            <p className="text-xs text-stone-500 uppercase tracking-wider">Edit Stats</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-stone-600 mb-1">Max HP</p>
                <input type="number" value={maxHpInput} onChange={e => setMaxHpInput(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">Current HP</p>
                <input type="number" value={currentHpInput} onChange={e => setCurrentHpInput(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">AC</p>
                <input type="number" value={acInput} onChange={e => setAcInput(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-stone-600 mb-1">Speed (ft)</p>
                <input type="number" value={speedInput} placeholder="30" onChange={e => setSpeedInput(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">Passive Perception</p>
                <input type="number" value={perceptionInput} placeholder="10" onChange={e => setPerceptionInput(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void handleSaveStats()}
                className="flex-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-medium py-1.5 rounded-lg transition-colors">
                Save Stats
              </button>
              <button onClick={() => {
                setShowStatEdit(false)
                setMaxHpInput(String(c.maxHp)); setCurrentHpInput(String(c.currentHp)); setAcInput(String(c.armorClass))
                setSpeedInput(c.speed !== null ? String(c.speed) : ''); setPerceptionInput(c.passivePerception !== null ? String(c.passivePerception) : '')
              }}
                className="text-stone-500 hover:text-stone-300 text-xs px-3 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowStatEdit(true)}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
            Edit stats (HP / AC / Speed / Perception)
          </button>
        )}
      </div>

      {/* Conditions toggle panel */}
      <div className="border-t border-stone-800/50 pt-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setShowConditions(v => !v)}
            className="text-xs text-stone-600 hover:text-stone-400 transition-colors">
            {showConditions ? 'Hide conditions' : 'Conditions'}
          </button>
          {c.conditions.length > 0 && !showConditions && (
            <div className="flex flex-wrap gap-0.5">
              {c.conditions.map(cond => (
                <span key={cond.name} className="text-sm leading-none" title={cond.name}>
                  {CONDITION_ICONS[cond.name.toLowerCase()] ?? <span className="text-amber-400 text-xs">{cond.name}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        {showConditions && (
          <div className="grid grid-cols-5 gap-1.5">
            {STANDARD_CONDITIONS.map(name => {
              const isActive = c.conditions.some(cond => cond.name.toLowerCase() === name)
              return (
                <button
                  key={name}
                  onClick={() => void handleToggleCondition(name)}
                  title={name.charAt(0).toUpperCase() + name.slice(1)}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-amber-500 bg-amber-950/50 text-amber-300'
                      : 'border-stone-700 bg-stone-800 text-stone-500 hover:border-stone-500 hover:text-stone-300'
                  }`}
                >
                  <span className="text-base leading-none">{CONDITION_ICONS[name]}</span>
                  <span className="leading-none truncate w-full text-center" style={{ fontSize: '0.6rem' }}>
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Classes & level up */}
      <MulticlassPanel character={c} dmPin={getDmPin()} onRefresh={onRefresh} />

      {/* Fighting style analysis */}
      <div className="border-t border-stone-800/50 pt-3">
        <button
          onClick={() => setShowFightingStyle(v => !v)}
          className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
        >
          {showFightingStyle ? 'Hide fighting style' : 'Fighting style'}
        </button>
        {showFightingStyle && (
          <p className="text-sm text-stone-300 mt-2 leading-relaxed italic">
            {describeFightingStyle(c)}
          </p>
        )}
      </div>

      {/* Class features gained so far */}
      <div className="border-t border-stone-800/50 pt-3">
        <button
          onClick={() => setShowFeatures(v => !v)}
          className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
        >
          {showFeatures ? 'Hide features' : 'Features'}
        </button>
        {showFeatures && (
          <div className="mt-2">
            <FeaturesTab classes={classes} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Fighting style analysis ───────────────────────────────────────────────────

function describeFightingStyle(c: Character): string {
  const scores = c.abilityScores
  const cls = c.class.toLowerCase()
  const hasSpells = c.spellSlots.length > 0
  const maxSlotLevel = hasSpells ? Math.max(...c.spellSlots.map(s => s.level)) : 0
  const isFullCaster = hasSpells && maxSlotLevel >= 5
  const isHighAC = c.armorClass >= 17
  const isLowAC  = c.armorClass <= 12
  const isHighHP = c.maxHp >= c.level * 10
  const isLowHP  = c.maxHp <= c.level * 5

  // Sort ability scores highest → lowest
  const sorted = scores
    ? (Object.entries(scores) as [keyof typeof scores, number][]).sort((a, b) => b[1] - a[1])
    : []
  const top1   = sorted[0]?.[0] ?? null
  const bottom  = sorted[sorted.length - 1]?.[0] ?? null
  const botVal  = sorted[sorted.length - 1]?.[1] ?? 10

  // ── Role sentence (class-based) ──────────────────────────────────────────
  const roleMap: Record<string, string> = {
    barbarian:     `${c.characterName} is a raging frontliner who charges headfirst into the thick of combat.`,
    fighter:       `${c.characterName} is a disciplined combatant with a broad martial toolkit.`,
    paladin:       `${c.characterName} is a holy warrior who anchors the frontline while backing allies with divine power.`,
    ranger:        `${c.characterName} is a hunter who excels at controlling the battlefield from range.`,
    rogue:         `${c.characterName} is a surgical striker who waits for the perfect moment to deal decisive blows.`,
    monk:          `${c.characterName} is a mobile skirmisher who darts in and out of reach.`,
    cleric:        `${c.characterName} is a divine agent who swings between frontline presence and crucial support.`,
    druid:         `${c.characterName} is a shapeshifter and nature-caller who adapts their role to the encounter.`,
    wizard:        `${c.characterName} is an arcane artillery piece who can reshape encounters with the right spell.`,
    sorcerer:      `${c.characterName} is a raw magical powerhouse who blasts enemies with innate arcane force.`,
    warlock:       `${c.characterName} is a pact-bound striker who leans on eldritch power and recovers between short rests.`,
    bard:          `${c.characterName} is a versatile wildcard who inspires allies while keeping enemies off-balance.`,
    artificer:     `${c.characterName} is a gadget-wielding tactician who supports the party with tools and spells.`,
    'blood hunter':`${c.characterName} is a hunter of dark things who brands enemies and bleeds for power.`,
  }
  const role = roleMap[cls] ?? `${c.characterName} is a capable combatant whose fighting style blends multiple disciplines.`

  // ── Approach sentence (dominant stat + AC) ───────────────────────────────
  let approach = ''
  if (top1 === 'str' && isHighAC) {
    approach = `With high Strength and solid armor, they punch through defenses and absorb punishment in equal measure.`
  } else if (top1 === 'str') {
    approach = `Their raw Strength makes them hit hard, though they're more of an aggressive attacker than a defensive anchor.`
  } else if (top1 === 'dex' && isLowAC) {
    approach = `They rely on mobility and precision rather than heavy armor — they're dangerous when allowed to move freely.`
  } else if (top1 === 'dex') {
    approach = `Their agility keeps them light on their feet, favoring finesse and positioning over brute force.`
  } else if (top1 === 'int' && isFullCaster) {
    approach = `Their commanding Intelligence lets them pick spells that exploit exactly where enemies are weakest.`
  } else if (top1 === 'wis' && isFullCaster) {
    approach = `Their Wisdom guides both their divine magic and their reading of the battlefield.`
  } else if (top1 === 'cha' && isFullCaster) {
    approach = `Their Charisma fuels their magic and makes them a commanding presence even outside of combat.`
  } else if (top1 === 'con') {
    approach = `Their exceptional Constitution makes them an endurance fighter — they outlast what they can't outfight.`
  } else {
    approach = `Their stat spread suggests a balanced approach, adapting to whatever the encounter demands.`
  }

  // ── Vulnerability / key note ─────────────────────────────────────────────
  let note = ''
  if (isLowHP && isLowAC) {
    note = `Keep them off the front line — they'll fold quickly if enemies close the gap.`
  } else if (isHighHP && isHighAC) {
    note = `They can afford to be aggressive; they're one of the most durable targets on the field.`
  } else if (isFullCaster && (isLowHP || isLowAC)) {
    note = `Their power is in their spells — protect them or expect them to burn slots on self-preservation.`
  } else if (bottom === 'wis' && botVal <= 8) {
    note = `Their low Wisdom makes them vulnerable to charm and fear effects — mind-affecting magic will hit them harder than most.`
  } else if (bottom === 'con' && botVal <= 8) {
    note = `Their weak Constitution means concentration checks are a liability whenever they take damage.`
  } else if (isHighAC && !isHighHP) {
    note = `Hard to hit but not inexhaustible — they'll hold the line but need healing to sustain it.`
  } else if (!scores) {
    note = `No ability scores on file — this read is based on class alone.`
  } else {
    note = `A well-rounded combatant without glaring blind spots — use varied encounter types to keep them challenged.`
  }

  return `${role} ${approach} ${note}`
}

// ── Combat Tab ────────────────────────────────────────────────────────────────

function CombatTab({ campaignId, characters, session, onSessionChange, onRosterRefresh, initiativeRequest, onInitiativeRequestChange }: {
  campaignId: string
  characters: Character[]
  session: CombatSession | null
  onSessionChange: (s: CombatSession | null) => void
  onRosterRefresh: () => void
  initiativeRequest: InitiativeRequest | null
  onInitiativeRequestChange: (r: InitiativeRequest | null) => void
}) {
  const [initiativeInputs, setInitiativeInputs] = useState<Record<string, string>>({})
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [hpInput, setHpInput] = useState('')
  const [conditionName, setConditionName] = useState('')
  const [conditionRounds, setConditionRounds] = useState('')
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Auto-fill initiative inputs when player rolls arrive via Realtime
  useEffect(() => {
    if (!initiativeRequest) return
    setInitiativeInputs(prev => {
      const next = { ...prev }
      for (const [charId, roll] of Object.entries(initiativeRequest.rolls)) {
        next[charId] = String(roll)
      }
      return next
    })
  }, [initiativeRequest])

  async function handleRequestInitiative() {
    setLoading(true)
    try {
      const res = await fetch('/api/initiative/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, dmPin: getDmPin() }),
      })
      const data: unknown = await res.json()
      if (isInitiativeRequestApiResponse(data)) onInitiativeRequestChange(data.request)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelInitiativeRequest() {
    await fetch(`/api/initiative/request?campaignId=${campaignId}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    onInitiativeRequestChange(null)
  }

  async function handleStartCombat() {
    const order = characters
      .map(c => ({
        characterId: c.id,
        name: c.characterName,
        initiative: parseInt(initiativeInputs[c.id] ?? '0', 10) || 0,
      }))
      .sort((a, b) => b.initiative - a.initiative)
    setLoading(true)
    try {
      const [combatRes] = await Promise.all([
        fetch('/api/combat/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, initiativeOrder: order, dmPin: getDmPin() }),
        }),
        initiativeRequest
          ? fetch(`/api/initiative/request?campaignId=${campaignId}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
          : Promise.resolve(new Response()),
      ])
      const data: unknown = await combatRes.json()
      if (isStartCombatResponse(data)) onSessionChange(data.session)
      onInitiativeRequestChange(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleEndCombat() {
    setLoading(true)
    try {
      await fetch('/api/combat/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, dmPin: getDmPin() }),
      })
      onSessionChange(null)
      setSelectedCharId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleNextTurn = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/combat/next-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          currentTurnIndex: session.currentTurnIndex,
          initiativeOrderLength: session.initiativeOrder.length,
          roundNumber: session.roundNumber,
          dmPin: getDmPin(),
        }),
      })
      const data: unknown = await res.json()
      if (isNextTurnResponse(data)) onSessionChange(data.session)
    } finally {
      setLoading(false)
    }
  }, [session, onSessionChange])

  useEffect(() => {
    if (!session) return
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'n' || e.key === 'N') void handleNextTurn()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [session, handleNextTurn])

  async function handleHpChange(characterId: string, delta: number, currentHp: number, maxHp: number) {
    const newHp = Math.max(0, Math.min(maxHp, currentHp + delta))
    await fetch('/api/characters/hp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, newHp, dmPin: getDmPin() }),
    })
    setHpInput('')
    onRosterRefresh()
  }

  async function handleAddCondition(characterId: string, currentConditions: Condition[]) {
    if (!conditionName.trim()) return
    const rounds = conditionRounds.trim() ? parseInt(conditionRounds, 10) : null
    const newConditions = [...currentConditions, { name: conditionName.trim(), roundsRemaining: isNaN(rounds as number) ? null : rounds }]
    await fetch('/api/characters/conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, conditions: newConditions, dmPin: getDmPin() }),
    })
    setConditionName('')
    setConditionRounds('')
    setShowConditionForm(false)
    onRosterRefresh()
  }

  async function handleRemoveCondition(characterId: string, name: string, currentConditions: Condition[]) {
    const newConditions = currentConditions.filter(c => c.name !== name)
    await fetch('/api/characters/conditions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, conditions: newConditions, dmPin: getDmPin() }),
    })
    onRosterRefresh()
  }

  async function handleDeathSave(characterId: string, type: 'success' | 'failure', current: DeathSaves) {
    const deathSaves: DeathSaves = {
      successes: type === 'success' ? Math.min(3, current.successes + 1) : current.successes,
      failures: type === 'failure' ? Math.min(3, current.failures + 1) : current.failures,
    }
    await fetch('/api/characters/death-saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, deathSaves }),
    })
    onRosterRefresh()
  }

  async function handleResetDeathSaves(characterId: string) {
    await fetch('/api/characters/death-saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId, deathSaves: { successes: 0, failures: 0 } }),
    })
    onRosterRefresh()
  }

  // ── Setup: no active combat ────────────────────────────────────────────────

  if (!session) {
    if (characters.length === 0) {
      return (
        <div className="text-center py-16 text-stone-500">
          <p>No players yet. Share the campaign code to start.</p>
        </div>
      )
    }
    return (
      <div className="space-y-5">
        {/* Initiative request section */}
        {!initiativeRequest ? (
          <button
            onClick={() => void handleRequestInitiative()}
            disabled={loading}
            className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-50 border border-stone-700 text-stone-300 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            🎲 Request Rolls from Players
          </button>
        ) : (
          <div className="bg-stone-900 border border-amber-700/40 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-400 font-medium">Waiting for initiative rolls…</p>
              <button
                onClick={() => void handleCancelInitiativeRequest()}
                className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {characters.map(c => {
                const rolled = initiativeRequest.rolls[c.id] !== undefined
                return (
                  <span key={c.id} className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                    rolled ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50' : 'bg-stone-800 text-stone-500 border border-stone-700'
                  }`}>
                    {rolled ? '✓' : '…'} {c.characterName}
                    {rolled && <span className="font-mono font-bold ml-0.5">{initiativeRequest.rolls[c.id]}</span>}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-stone-300 mb-1">Initiative Order</p>
          <p className="text-xs text-stone-500 mb-4">
            {initiativeRequest ? 'Player rolls auto-fill — adjust if needed.' : 'Enter each character\'s roll — higher goes first.'}
          </p>
          <div className="space-y-2">
            {characters.map(c => {
              const hpPercent = c.maxHp > 0 ? Math.max(0, (c.currentHp / c.maxHp) * 100) : 0
              const hpColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
              const isSelected = selectedCharId === c.id
              return (
                <div key={c.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.characterName}</p>
                      <p className="text-stone-500 text-xs">{c.class} · {c.playerName}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-stone-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                        </div>
                        <span className="text-xs font-mono text-stone-400 tabular-nums">
                          {c.currentHp}<span className="text-stone-600">/{c.maxHp}</span>
                        </span>
                        <button
                          onClick={() => { setSelectedCharId(isSelected ? null : c.id); setHpInput('') }}
                          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${isSelected ? 'text-amber-400' : 'text-stone-600 hover:text-amber-400'}`}
                        >
                          ±HP
                        </button>
                      </div>
                    </div>
                    {initiativeRequest?.rolls[c.id] !== undefined && (
                      <span className="text-emerald-500 text-xs">✓</span>
                    )}
                    <input
                      type="number"
                      min={1}
                      max={30}
                      placeholder="—"
                      value={initiativeInputs[c.id] ?? ''}
                      onChange={e => setInitiativeInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                      className="w-16 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-center text-sm font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {isSelected && (
                    <div className="px-4 pb-3 border-t border-stone-800/50 pt-2.5">
                      <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">HP Adjustment</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          placeholder="Amount"
                          value={hpInput}
                          onChange={e => setHpInput(e.target.value)}
                          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => void handleHpChange(c.id, -(parseInt(hpInput, 10) || 0), c.currentHp, c.maxHp)}
                          className="bg-red-900 hover:bg-red-800 text-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          Dmg
                        </button>
                        <button
                          onClick={() => void handleHpChange(c.id, parseInt(hpInput, 10) || 0, c.currentHp, c.maxHp)}
                          className="bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          Heal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <button
          onClick={() => void handleStartCombat()}
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-base"
        >
          {loading ? 'Starting…' : '⚔ Start Combat'}
        </button>
      </div>
    )
  }

  // ── Active combat ──────────────────────────────────────────────────────────

  const currentEntry = session.initiativeOrder[session.currentTurnIndex]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-widest">Round</p>
          <p className="text-4xl font-bold tabular-nums">{session.roundNumber}</p>
        </div>
        <button
          onClick={() => void handleEndCombat()}
          disabled={loading}
          className="text-xs text-stone-500 hover:text-red-400 transition-colors px-3 py-1.5 border border-stone-800 rounded-lg"
        >
          End Combat
        </button>
      </div>

      {currentEntry && (
        <div className="bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="text-red-400">⚔</span>
          <p className="font-semibold">{currentEntry.name}</p>
          <p className="text-stone-500 text-sm">is acting</p>
        </div>
      )}

      <div className="space-y-2">
        {session.initiativeOrder.map((entry, idx) => {
          const char = characters.find(c => c.id === entry.characterId)
          if (!char) return null
          const isCurrentTurn = idx === session.currentTurnIndex
          const isSelected = selectedCharId === char.id
          const hpPercent = Math.max(0, (char.currentHp / char.maxHp) * 100)
          const hpColor = hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
          const isDowned = char.currentHp === 0

          return (
            <div key={char.id}
              className={`rounded-xl border transition-colors ${isCurrentTurn ? 'border-red-700/60 bg-red-950/20' : 'border-stone-800 bg-stone-900'}`}
            >
              <button
                onClick={() => {
                  setSelectedCharId(isSelected ? null : char.id)
                  setHpInput('')
                  setShowConditionForm(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <span className="text-stone-500 font-mono text-sm w-6 shrink-0 text-center">{entry.initiative}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {isCurrentTurn && <span className="text-red-400 text-xs leading-none">▶</span>}
                    <p className={`font-medium text-sm ${isDowned ? 'text-red-400' : ''}`}>{char.characterName}</p>
                    {isDowned && <span className="text-xs text-red-500 font-semibold">DOWNED</span>}
                    {char.conditions.map(cond => {
                      const icon = CONDITION_ICONS[cond.name.toLowerCase()]
                      return (
                        <span key={cond.name} title={cond.name} className="text-sm leading-none">
                          {icon ?? <span className="text-amber-400 text-xs">{cond.name}</span>}
                        </span>
                      )
                    })}
                  </div>
                  <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${hpColor}`} style={{ width: `${hpPercent}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums">{char.currentHp}<span className="text-stone-500 text-xs font-normal">/{char.maxHp}</span></p>
                  <p className="text-stone-500 text-xs">AC {char.armorClass}</p>
                </div>
              </button>

              {isSelected && (
                <div className="px-4 pb-4 space-y-4 border-t border-stone-800/50 pt-3">
                  {/* HP */}
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">HP Adjustment</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={hpInput}
                        onChange={e => setHpInput(e.target.value)}
                        className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button
                        onClick={() => void handleHpChange(char.id, -(parseInt(hpInput, 10) || 0), char.currentHp, char.maxHp)}
                        className="bg-red-900 hover:bg-red-800 text-red-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Dmg
                      </button>
                      <button
                        onClick={() => void handleHpChange(char.id, parseInt(hpInput, 10) || 0, char.currentHp, char.maxHp)}
                        className="bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Heal
                      </button>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-stone-500 uppercase tracking-wider">Conditions</p>
                      <button
                        onClick={() => setShowConditionForm(v => !v)}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        {showConditionForm ? 'Cancel' : '+ Add'}
                      </button>
                    </div>
                    {char.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {char.conditions.map(cond => {
                          const icon = CONDITION_ICONS[cond.name.toLowerCase()]
                          return (
                            <span key={cond.name} className="flex items-center gap-1 text-xs bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">
                              {icon && <span className="text-sm leading-none">{icon}</span>}
                              {cond.name}{cond.roundsRemaining !== null ? ` (${cond.roundsRemaining}r)` : ''}
                              <button
                                onClick={() => void handleRemoveCondition(char.id, cond.name, char.conditions)}
                                className="text-amber-500 hover:text-red-400 ml-0.5 leading-none"
                              >×</button>
                            </span>
                          )
                        })}
                      </div>
                    )}
                    {!showConditionForm && char.conditions.length === 0 && (
                      <p className="text-xs text-stone-600 italic">None</p>
                    )}
                    {showConditionForm && (
                      <div className="flex gap-2">
                        <input
                          placeholder="e.g. Poisoned"
                          value={conditionName}
                          onChange={e => setConditionName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') void handleAddCondition(char.id, char.conditions) }}
                          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="number"
                          placeholder="Rounds"
                          min={1}
                          value={conditionRounds}
                          onChange={e => setConditionRounds(e.target.value)}
                          className="w-20 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-amber-500"
                        />
                        <button
                          onClick={() => void handleAddCondition(char.id, char.conditions)}
                          className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >Add</button>
                      </div>
                    )}
                  </div>

                  {/* Death Saves */}
                  {isDowned && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-stone-500 uppercase tracking-wider">Death Saves</p>
                        <button
                          onClick={() => void handleResetDeathSaves(char.id)}
                          className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
                        >Reset</button>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-emerald-500 w-4">S</span>
                          {[0, 1, 2].map(i => (
                            <button key={i}
                              onClick={() => void handleDeathSave(char.id, 'success', char.deathSaves)}
                              className={`w-6 h-6 rounded-full border-2 transition-colors ${i < char.deathSaves.successes ? 'bg-emerald-500 border-emerald-400' : 'border-stone-600 bg-stone-800'}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-500 w-4">F</span>
                          {[0, 1, 2].map(i => (
                            <button key={i}
                              onClick={() => void handleDeathSave(char.id, 'failure', char.deathSaves)}
                              className={`w-6 h-6 rounded-full border-2 transition-colors ${i < char.deathSaves.failures ? 'bg-red-500 border-red-400' : 'border-stone-600 bg-stone-800'}`}
                            />
                          ))}
                        </div>
                        {char.deathSaves.successes >= 3 && <span className="text-xs text-emerald-400 font-medium">Stable!</span>}
                        {char.deathSaves.failures >= 3 && <span className="text-xs text-red-400 font-medium">Dead</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => void handleNextTurn()}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
      >
        {loading ? '…' : 'Next Turn →'}
      </button>
    </div>
  )
}

// ── Fate Engine Tab ───────────────────────────────────────────────────────────

type FateState = 'idle' | 'pending_reveal' | 'revealed'

function FateTab({ campaignId, characters }: { campaignId: string; characters: Character[] }) {
  const [eventType, setEventType] = useState<FateEventType>('mystery')
  const [dangerWeighted, setDangerWeighted] = useState(false)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [fateState, setFateState] = useState<FateState>('idle')
  const [pendingEvent, setPendingEvent] = useState<FateEvent | null>(null)
  const [revealedTarget, setRevealedTarget] = useState<Character | null>(null)
  const [fateLog, setFateLog] = useState<(FateEvent & { targetName: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [pushSent, setPushSent] = useState(false)

  const loadLog = useCallback(async () => {
    const res = await fetch(`/api/fate/log?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isFateLogResponse(data)) {
      setFateLog(data.events.map(e => ({
        ...e,
        targetName: characters.find(c => c.id === e.targetCharacterId)?.characterName ?? 'Unknown',
      })))
    }
  }, [campaignId, characters])

  useEffect(() => { void loadLog() }, [loadLog])

  function toggleExclude(id: string) {
    setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDraw() {
    setLoading(true)
    try {
      const res = await fetch('/api/fate/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, eventType, excludedCharacterIds: Array.from(excluded), dangerWeighted, dmPin: getDmPin() }),
      })
      const data: unknown = await res.json()
      if (!res.ok || !isDrawResponse(data)) return
      setPendingEvent(data.fateEvent)
      setPushSent(data.pushSent)
      setFateState('pending_reveal')
    } finally {
      setLoading(false)
    }
  }

  async function handleReveal() {
    if (!pendingEvent) return
    setLoading(true)
    try {
      await fetch('/api/fate/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fateEventId: pendingEvent.id, dmPin: getDmPin() }),
      })
      setRevealedTarget(characters.find(c => c.id === pendingEvent.targetCharacterId) ?? null)
      setFateState('revealed')
      void loadLog()
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setFateState('idle'); setPendingEvent(null); setRevealedTarget(null); setPushSent(false)
  }

  return (
    <div className="space-y-6">
      {fateState === 'idle' && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-stone-300 mb-2">Event Type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EVENT_TYPES.map(et => (
                <button key={et.value} onClick={() => setEventType(et.value)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    eventType === et.value
                      ? 'border-amber-500 bg-amber-950/40 text-amber-300'
                      : 'border-stone-800 bg-stone-900 text-stone-400 hover:border-stone-600'
                  }`}>
                  <p className="font-medium text-sm">{et.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{et.description}</p>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer" onClick={() => setDangerWeighted(v => !v)}>
            <div className={`w-10 h-6 rounded-full transition-colors relative ${dangerWeighted ? 'bg-amber-600' : 'bg-stone-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${dangerWeighted ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-300">Danger Weighted</p>
              <p className="text-xs text-stone-500">Lower HP = more likely to be chosen</p>
            </div>
          </label>

          {characters.length > 0 && (
            <div>
              <p className="text-sm font-medium text-stone-300 mb-2">Exclude from Pool</p>
              {(() => {
                const activePool = characters.filter(c => !excluded.has(c.id))
                const rawWeights = activePool.map(c => {
                  const deficit = Math.max(0, 1 - c.currentHp / c.maxHp)
                  return dangerWeighted ? Math.max(0.05, deficit * deficit) : 1
                })
                const totalW = rawWeights.reduce((a, b) => a + b, 0)
                const probMap = new Map(activePool.map((c, i) => [c.id, totalW > 0 ? rawWeights[i] / totalW : 0]))
                return (
                  <div className="flex flex-wrap gap-2">
                    {characters.map(c => (
                      <button key={c.id} onClick={() => toggleExclude(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                          excluded.has(c.id)
                            ? 'border-stone-600 bg-stone-800 text-stone-500 line-through'
                            : 'border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-500'
                        }`}>
                        {c.characterName}
                        {dangerWeighted && !excluded.has(c.id) && (
                          <span className={`font-mono ${
                            (probMap.get(c.id) ?? 0) > 0.4 ? 'text-red-400' :
                            (probMap.get(c.id) ?? 0) > 0.2 ? 'text-amber-400' : 'text-stone-500'
                          }`}>
                            {Math.round((probMap.get(c.id) ?? 0) * 100)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          <button onClick={() => void handleDraw()} disabled={loading || characters.length === 0}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-colors text-lg">
            {loading ? 'Casting fate…' : 'Cast Fate'}
          </button>
        </div>
      )}

      {fateState === 'pending_reveal' && pendingEvent && (
        <div className="text-center space-y-6 py-6">
          <div className="space-y-2">
            <p className="text-stone-400 text-sm uppercase tracking-widest">The fates have spoken</p>
            <p className="text-xl font-semibold">{EVENT_TYPES.find(e => e.value === pendingEvent.eventType)?.label}</p>
            {pushSent
              ? <p className="text-emerald-400 text-sm">A chosen soul has been notified…</p>
              : <p className="text-stone-500 text-sm">Target selected. Ready to reveal.</p>
            }
          </div>
          <button onClick={() => void handleReveal()} disabled={loading}
            className="w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-colors text-xl animate-pulse">
            {loading ? 'Revealing…' : '⚡ Reveal'}
          </button>
        </div>
      )}

      {fateState === 'revealed' && revealedTarget && pendingEvent && (
        <div className="text-center space-y-4 py-6">
          <p className="text-stone-400 text-sm uppercase tracking-widest">Fate has chosen</p>
          <div className="bg-stone-900 border-2 border-amber-500 rounded-2xl p-6 space-y-1">
            <p className="text-3xl font-bold text-amber-400">{revealedTarget.characterName}</p>
            <p className="text-stone-400">{revealedTarget.playerName} · {revealedTarget.class}</p>
            <p className="text-sm text-stone-500 mt-2">{EVENT_TYPES.find(e => e.value === pendingEvent.eventType)?.description}</p>
          </div>
          <button onClick={handleReset} className="text-sm text-stone-500 hover:text-stone-300 underline">
            Draw again
          </button>
        </div>
      )}

      {fateLog.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500 uppercase tracking-widest">Fate Log</p>
          {fateLog.map(e => (
            <div key={e.id} className="flex items-center justify-between text-sm bg-stone-900 rounded-lg px-3 py-2">
              <span className="text-stone-300 capitalize">{e.eventType}</span>
              <span className="text-amber-400 font-medium">{e.targetName}</span>
              <span className="text-stone-600 text-xs">
                {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── World Tab ─────────────────────────────────────────────────────────────────

function WorldTab({ campaignId, characters }: { campaignId: string; characters: Character[] }) {
  const [worldTab, setWorldTab] = useState<WorldTab>('npcs')
  const [npcs, setNpcs] = useState<Npc[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [sessionNotes, setSessionNotes] = useState<SessionNote[]>([])
  const [gold, setGold] = useState(0)
  const [silver, setSilver] = useState(0)
  const [copper, setCopper] = useState(0)
  const [customCurrency, setCustomCurrency] = useState<CustomCurrencyEntry[]>([])
  const [sharedItems, setSharedItems] = useState<InventoryItem[]>([])
  const [quests, setQuests] = useState<Quest[]>([])

  const fetchNpcs = useCallback(async () => {
    const res = await fetch(`/api/world/npcs?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isNpcsResponse(data)) setNpcs(data.npcs)
  }, [campaignId])

  const fetchLocations = useCallback(async () => {
    const res = await fetch(`/api/world/locations?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isLocationsResponse(data)) setLocations(data.locations)
  }, [campaignId])

  const fetchSessionNotes = useCallback(async () => {
    const res = await fetch(`/api/world/session-notes?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isSessionNotesResponse(data)) setSessionNotes(data.notes)
  }, [campaignId])

  const fetchInventory = useCallback(async () => {
    const res = await fetch(`/api/world/inventory?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isInventoryResponse(data)) {
      setGold(data.gold)
      setSilver(data.silver ?? 0)
      setCopper(data.copper ?? 0)
      setCustomCurrency(data.customCurrency ?? [])
      setSharedItems(data.sharedItems)
    }
  }, [campaignId])

  const fetchQuests = useCallback(async () => {
    const res = await fetch(`/api/world/quests?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isQuestsResponse(data)) setQuests(data.quests)
  }, [campaignId])

  useEffect(() => {
    void Promise.all([fetchNpcs(), fetchLocations(), fetchSessionNotes(), fetchInventory(), fetchQuests()])
  }, [fetchNpcs, fetchLocations, fetchSessionNotes, fetchInventory, fetchQuests])

  const WORLD_LABELS: Record<WorldTab, string> = { npcs: 'NPCs', locations: 'Locations', inventory: 'Inventory', log: 'Log', tables: 'Tables', quests: 'Quests' }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-stone-900 rounded-lg p-1 overflow-x-auto">
        {(['npcs', 'locations', 'inventory', 'log', 'tables', 'quests'] as WorldTab[]).map(t => (
          <button key={t} onClick={() => setWorldTab(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              worldTab === t ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
            }`}>
            {WORLD_LABELS[t]}
          </button>
        ))}
      </div>

      {worldTab === 'npcs' && (
        <NpcsSection campaignId={campaignId} characters={characters} npcs={npcs} onRefresh={fetchNpcs} />
      )}
      {worldTab === 'locations' && (
        <LocationsSection campaignId={campaignId} locations={locations} onRefresh={fetchLocations} />
      )}
      {worldTab === 'inventory' && (
        <InventorySection
          campaignId={campaignId} characters={characters}
          gold={gold} silver={silver} copper={copper} customCurrency={customCurrency}
          sharedItems={sharedItems}
          onRefresh={fetchInventory}
        />
      )}
      {worldTab === 'log' && (
        <SessionLogSection campaignId={campaignId} notes={sessionNotes} onRefresh={fetchSessionNotes} />
      )}
      {worldTab === 'tables' && (
        <TablesSection campaignId={campaignId} onQuestSaved={fetchQuests} />
      )}
      {worldTab === 'quests' && (
        <QuestsSection campaignId={campaignId} quests={quests} onRefresh={fetchQuests} />
      )}
    </div>
  )
}

// ── NPCs Section ──────────────────────────────────────────────────────────────

function NpcsSection({ campaignId, characters, npcs, onRefresh }: {
  campaignId: string; characters: Character[]; npcs: Npc[]; onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', faction: '', lastLocation: '', notes: '', relationships: {} as Record<string, string> })

  function resetForm() {
    setForm({ name: '', faction: '', lastLocation: '', notes: '', relationships: {} })
  }

  async function handleAdd() {
    if (!form.name.trim()) return
    const relationships: NpcRelationship[] = characters
      .filter(c => form.relationships[c.id]?.trim())
      .map(c => ({ characterId: c.id, relationship: form.relationships[c.id].trim() }))
    await fetch('/api/world/npcs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, name: form.name.trim(), faction: form.faction || null, lastLocation: form.lastLocation || null, notes: form.notes || null, relationships, dmPin: getDmPin() }),
    })
    resetForm(); setShowForm(false); onRefresh()
  }

  async function handleEdit(npc: Npc) {
    const relationships: NpcRelationship[] = characters
      .filter(c => form.relationships[c.id]?.trim())
      .map(c => ({ characterId: c.id, relationship: form.relationships[c.id].trim() }))
    await fetch(`/api/world/npcs/${npc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name.trim(), faction: form.faction || null, lastLocation: form.lastLocation || null, notes: form.notes || null, relationships, dmPin: getDmPin() }),
    })
    setEditingId(null); onRefresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/world/npcs/${id}?dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    if (expandedId === id) setExpandedId(null)
    onRefresh()
  }

  function startEdit(npc: Npc) {
    const rel: Record<string, string> = {}
    npc.relationships.forEach(r => { rel[r.characterId] = r.relationship })
    setForm({ name: npc.name, faction: npc.faction ?? '', lastLocation: npc.lastLocation ?? '', notes: npc.notes ?? '', relationships: rel })
    setEditingId(npc.id)
    setExpandedId(npc.id)
  }

  return (
    <div className="space-y-3">
      {npcs.map(npc => (
        <div key={npc.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          <button onClick={() => setExpandedId(expandedId === npc.id ? null : npc.id)}
            className="w-full flex items-start justify-between px-4 py-3 text-left">
            <div>
              <p className="font-medium">{npc.name}</p>
              <p className="text-stone-500 text-xs mt-0.5">
                {[npc.faction, npc.lastLocation].filter(Boolean).join(' · ') || 'No details'}
              </p>
            </div>
            <span className="text-stone-600 text-xs mt-1">{expandedId === npc.id ? '▲' : '▼'}</span>
          </button>

          {expandedId === npc.id && (
            <div className="border-t border-stone-800 px-4 py-3 space-y-3">
              {editingId === npc.id ? (
                <NpcForm form={form} setForm={setForm} characters={characters}
                  onSave={() => void handleEdit(npc)} onCancel={() => setEditingId(null)} saveLabel="Save" />
              ) : (
                <>
                  {npc.notes && (
                    <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-500 mb-1">DM Notes</p>
                      <p className="text-sm text-stone-300 whitespace-pre-wrap">{npc.notes}</p>
                    </div>
                  )}
                  {npc.relationships.length > 0 && (
                    <div>
                      <p className="text-xs text-stone-500 mb-2">Relationships</p>
                      <div className="space-y-1">
                        {npc.relationships.map(r => {
                          const char = characters.find(c => c.id === r.characterId)
                          return char ? (
                            <div key={r.characterId} className="flex gap-2 text-sm">
                              <span className="text-stone-400 shrink-0">{char.characterName}:</span>
                              <span className="text-stone-300">{r.relationship}</span>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => startEdit(npc)} className="text-xs text-stone-400 hover:text-stone-200 transition-colors">Edit</button>
                    <button onClick={() => void handleDelete(npc.id)} className="text-xs text-red-600 hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {showForm ? (
        <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4">
          <p className="text-sm font-medium text-stone-300 mb-3">Add NPC</p>
          <NpcForm form={form} setForm={setForm} characters={characters}
            onSave={() => void handleAdd()} onCancel={() => { resetForm(); setShowForm(false) }} saveLabel="Add" />
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-stone-700 rounded-xl py-3 text-sm text-stone-500 hover:text-stone-300 hover:border-stone-500 transition-colors">
          + Add NPC
        </button>
      )}
    </div>
  )
}

function NpcForm({ form, setForm, characters, onSave, onCancel, saveLabel }: {
  form: { name: string; faction: string; lastLocation: string; notes: string; relationships: Record<string, string> }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  characters: Character[]
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  return (
    <div className="space-y-3">
      <input placeholder="Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="Faction" value={form.faction} onChange={e => setForm(p => ({ ...p, faction: e.target.value }))}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        <input placeholder="Last location" value={form.lastLocation} onChange={e => setForm(p => ({ ...p, lastLocation: e.target.value }))}
          className="bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
      </div>
      <textarea placeholder="DM notes / secrets" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none" />
      {characters.length > 0 && (
        <div>
          <p className="text-xs text-stone-500 mb-2">Relationships</p>
          <div className="space-y-1.5">
            {characters.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-stone-400 w-24 shrink-0 truncate">{c.characterName}</span>
                <input placeholder="Relationship…" value={form.relationships[c.id] ?? ''}
                  onChange={e => setForm(p => ({ ...p, relationships: { ...p.relationships, [c.id]: e.target.value } }))}
                  className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500" />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onSave} className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">{saveLabel}</button>
        <button onClick={onCancel} className="px-4 text-stone-500 hover:text-stone-300 text-sm transition-colors">Cancel</button>
      </div>
    </div>
  )
}

// ── Locations Section ─────────────────────────────────────────────────────────

function LocationsSection({ campaignId, locations, onRefresh }: {
  campaignId: string; locations: Location[]; onRefresh: () => void
}) {
  const [newName, setNewName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({})

  async function handleAdd() {
    if (!newName.trim()) return
    await fetch('/api/world/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, name: newName.trim(), dmPin: getDmPin() }),
    })
    setNewName(''); onRefresh()
  }

  async function handleToggleVisited(loc: Location) {
    await fetch(`/api/world/locations/${loc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visited: !loc.visited, notes: loc.notes, dmPin: getDmPin() }),
    })
    onRefresh()
  }

  async function handleSaveNotes(loc: Location) {
    await fetch(`/api/world/locations/${loc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visited: loc.visited, notes: editingNotes[loc.id] ?? loc.notes ?? '', dmPin: getDmPin() }),
    })
    onRefresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/world/locations/${id}?dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="space-y-2">
      {locations.map(loc => (
        <div key={loc.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => void handleToggleVisited(loc)}
              className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${loc.visited ? 'bg-emerald-600 border-emerald-500' : 'border-stone-600'}`}>
              {loc.visited && <span className="text-white text-xs leading-none">✓</span>}
            </button>
            <button onClick={() => {
              setExpandedId(expandedId === loc.id ? null : loc.id)
              if (!editingNotes[loc.id]) setEditingNotes(p => ({ ...p, [loc.id]: loc.notes ?? '' }))
            }} className="flex-1 text-left">
              <p className={`text-sm font-medium ${loc.visited ? 'text-stone-400' : 'text-stone-100'}`}>{loc.name}</p>
              {loc.notes && <p className="text-xs text-stone-600 truncate mt-0.5">{loc.notes}</p>}
            </button>
            <button onClick={() => void handleDelete(loc.id)} className="text-stone-700 hover:text-red-500 text-xs transition-colors">✕</button>
          </div>
          {expandedId === loc.id && (
            <div className="border-t border-stone-800 px-4 py-3 space-y-2">
              <textarea
                placeholder="Notes…"
                rows={3}
                value={editingNotes[loc.id] ?? loc.notes ?? ''}
                onChange={e => setEditingNotes(p => ({ ...p, [loc.id]: e.target.value }))}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
              />
              <button onClick={() => void handleSaveNotes(loc)}
                className="text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 px-3 py-1.5 rounded-lg transition-colors">
                Save notes
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <input placeholder="New location…" value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
          className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
        <button onClick={() => void handleAdd()}
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm px-4 py-2.5 rounded-xl transition-colors">
          Add
        </button>
      </div>
    </div>
  )
}

// ── Inventory Section ─────────────────────────────────────────────────────────

type CoinDenom = 'gold' | 'silver' | 'copper'

function CoinRow({
  label, abbr, color, amount,
  onDelta, onSet,
}: {
  label: string; abbr: string; color: string; amount: number
  onDelta: (d: number) => void; onSet: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium w-6 text-right ${color}`}>{abbr}</span>
      <button onClick={() => onDelta(-10)} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−10</button>
      <button onClick={() => onDelta(-1)} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−1</button>
      {editing ? (
        <input type="number" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onSet(parseInt(input, 10) || 0); setEditing(false) } if (e.key === 'Escape') setEditing(false) }}
          onBlur={() => { onSet(parseInt(input, 10) || 0); setEditing(false) }}
          autoFocus
          className="w-20 bg-stone-800 border border-amber-500 rounded px-2 py-0.5 text-center text-sm font-mono font-bold focus:outline-none" />
      ) : (
        <button onClick={() => { setInput(String(amount)); setEditing(true) }}
          className={`w-20 text-center text-lg font-bold tabular-nums ${color}`}>
          {amount.toLocaleString()}
        </button>
      )}
      <button onClick={() => onDelta(1)} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+1</button>
      <button onClick={() => onDelta(10)} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+10</button>
      <span className="text-xs text-stone-600">{label}</span>
    </div>
  )
}

function InventorySection({ campaignId, characters, gold, silver, copper, customCurrency, sharedItems, onRefresh }: {
  campaignId: string
  characters: Character[]
  gold: number; silver: number; copper: number
  customCurrency: CustomCurrencyEntry[]
  sharedItems: InventoryItem[]
  onRefresh: () => void
}) {
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', notes: '' })
  const [showItemForm, setShowItemForm] = useState(false)
  const [lootInputs, setLootInputs] = useState<Record<string, { name: string; quantity: string }>>({})
  const [expandedChar, setExpandedChar] = useState<string | null>(null)
  const [newCustomName, setNewCustomName] = useState('')
  const [newCustomAmount, setNewCustomAmount] = useState('0')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [charCoinInputs, setCharCoinInputs] = useState<Record<string, { gold: number; silver: number; copper: number; custom: CustomCurrencyEntry[] }>>({})
  const [charNewCustom, setCharNewCustom] = useState<Record<string, { name: string; amount: string }>>({})

  function getCharCoins(char: Character) {
    return charCoinInputs[char.id] ?? { gold: char.gold, silver: char.silver, copper: char.copper, custom: char.customCurrency }
  }

  async function savePartyCoins(overrides: { gold?: number; silver?: number; copper?: number; customCurrency?: CustomCurrencyEntry[] }) {
    await fetch('/api/world/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        gold: overrides.gold ?? gold,
        silver: overrides.silver ?? silver,
        copper: overrides.copper ?? copper,
        customCurrency: overrides.customCurrency ?? customCurrency,
        sharedItems,
        dmPin: getDmPin(),
      }),
    })
    onRefresh()
  }

  async function saveCharCoins(char: Character, coins: { gold: number; silver: number; copper: number; custom: CustomCurrencyEntry[] }) {
    await fetch('/api/characters/currency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: char.id, gold: coins.gold, silver: coins.silver, copper: coins.copper, customCurrency: coins.custom }),
    })
    onRefresh()
  }

  async function handleAddItem() {
    if (!newItem.name.trim()) return
    const item: InventoryItem = { name: newItem.name.trim(), quantity: parseInt(newItem.quantity, 10) || 1, notes: newItem.notes || null }
    await fetch('/api/world/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, gold, silver, copper, customCurrency, sharedItems: [...sharedItems, item], dmPin: getDmPin() }),
    })
    setNewItem({ name: '', quantity: '1', notes: '' }); setShowItemForm(false); onRefresh()
  }

  async function handleRemoveItem(idx: number) {
    const updated = sharedItems.filter((_, i) => i !== idx)
    await fetch('/api/world/inventory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, gold, silver, copper, customCurrency, sharedItems: updated, dmPin: getDmPin() }),
    })
    onRefresh()
  }

  async function handleAddLoot(char: Character) {
    const input = lootInputs[char.id]
    if (!input?.name?.trim()) return
    const item: LootItem = { name: input.name.trim(), quantity: parseInt(input.quantity, 10) || 1, notes: null }
    await fetch('/api/world/character-loot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: char.id, loot: [...char.loot, item], dmPin: getDmPin() }),
    })
    setLootInputs(p => ({ ...p, [char.id]: { name: '', quantity: '1' } })); onRefresh()
  }

  async function handleRemoveLoot(char: Character, idx: number) {
    const updated = char.loot.filter((_, i) => i !== idx)
    await fetch('/api/world/character-loot', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterId: char.id, loot: updated, dmPin: getDmPin() }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-5">
      {/* Party coins */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
        <p className="text-xs text-stone-500 uppercase tracking-widest">Party Wallet</p>
        <CoinRow label="gold" abbr="gp" color="text-amber-400" amount={gold}
          onDelta={d => void savePartyCoins({ gold: gold + d })}
          onSet={v => void savePartyCoins({ gold: v })} />
        <CoinRow label="silver" abbr="sp" color="text-slate-300" amount={silver}
          onDelta={d => void savePartyCoins({ silver: silver + d })}
          onSet={v => void savePartyCoins({ silver: v })} />
        <CoinRow label="copper" abbr="cp" color="text-orange-400" amount={copper}
          onDelta={d => void savePartyCoins({ copper: copper + d })}
          onSet={v => void savePartyCoins({ copper: v })} />

        {/* Custom currency */}
        {customCurrency.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs font-medium w-6 text-right text-violet-400 truncate">{entry.name.slice(0, 3)}</span>
            <button onClick={() => void savePartyCoins({ customCurrency: customCurrency.map((e, i) => i === idx ? { ...e, amount: e.amount - 10 } : e) })} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−10</button>
            <button onClick={() => void savePartyCoins({ customCurrency: customCurrency.map((e, i) => i === idx ? { ...e, amount: e.amount - 1 } : e) })} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−1</button>
            <span className="w-20 text-center text-lg font-bold tabular-nums text-violet-300">{entry.amount.toLocaleString()}</span>
            <button onClick={() => void savePartyCoins({ customCurrency: customCurrency.map((e, i) => i === idx ? { ...e, amount: e.amount + 1 } : e) })} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+1</button>
            <button onClick={() => void savePartyCoins({ customCurrency: customCurrency.map((e, i) => i === idx ? { ...e, amount: e.amount + 10 } : e) })} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+10</button>
            <span className="text-xs text-stone-400 flex-1">{entry.name}</span>
            <button onClick={() => void savePartyCoins({ customCurrency: customCurrency.filter((_, i) => i !== idx) })} className="text-stone-700 hover:text-red-500 text-xs transition-colors">✕</button>
          </div>
        ))}

        {showCustomForm ? (
          <div className="flex gap-2 items-center pt-1">
            <input placeholder="Currency name" value={newCustomName} onChange={e => setNewCustomName(e.target.value)}
              className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-violet-500" />
            <input type="number" min={0} placeholder="0" value={newCustomAmount} onChange={e => setNewCustomAmount(e.target.value)}
              className="w-16 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-center font-mono focus:outline-none focus:border-violet-500" />
            <button onClick={() => {
              if (!newCustomName.trim()) return
              void savePartyCoins({ customCurrency: [...customCurrency, { name: newCustomName.trim(), amount: parseInt(newCustomAmount, 10) || 0 }] })
              setNewCustomName(''); setNewCustomAmount('0'); setShowCustomForm(false)
            }} className="bg-violet-800 hover:bg-violet-700 text-xs text-violet-100 px-3 py-1 rounded transition-colors">Add</button>
            <button onClick={() => setShowCustomForm(false)} className="text-stone-500 hover:text-stone-300 text-xs transition-colors">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowCustomForm(true)} className="text-xs text-stone-600 hover:text-violet-400 transition-colors">+ Custom currency</button>
        )}
      </div>

      {/* Shared items */}
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Shared Items</p>
        <div className="space-y-1.5">
          {sharedItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2">
              <span className="text-stone-500 text-xs font-mono w-6 text-center">{item.quantity}×</span>
              <span className="flex-1 text-sm">{item.name}</span>
              {item.notes && <span className="text-xs text-stone-500">{item.notes}</span>}
              <button onClick={() => void handleRemoveItem(idx)} className="text-stone-700 hover:text-red-500 text-xs transition-colors">✕</button>
            </div>
          ))}
          {sharedItems.length === 0 && !showItemForm && (
            <p className="text-xs text-stone-600 italic px-1">No shared items</p>
          )}
        </div>
        {showItemForm ? (
          <div className="mt-2 space-y-2">
            <div className="flex gap-2">
              <input placeholder="Item name" value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              <input type="number" min={1} placeholder="Qty" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                className="w-16 bg-stone-800 border border-stone-700 rounded-lg px-2 py-2 text-sm text-center font-mono focus:outline-none focus:border-amber-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => void handleAddItem()} className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm py-2 rounded-lg transition-colors">Add</button>
              <button onClick={() => setShowItemForm(false)} className="text-stone-500 hover:text-stone-300 text-sm px-3 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowItemForm(true)} className="mt-2 text-xs text-stone-500 hover:text-amber-400 transition-colors">+ Add item</button>
        )}
      </div>

      {/* Character wallets + loot */}
      {characters.length > 0 && (
        <div>
          <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Characters</p>
          <div className="space-y-2">
            {characters.map(char => {
              const coins = getCharCoins(char)
              const totalItems = char.loot.length
              const hasCoins = coins.gold + coins.silver + coins.copper + coins.custom.length > 0
              return (
                <div key={char.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedChar(expandedChar === char.id ? null : char.id)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{char.characterName}</span>
                      {hasCoins && <span className="text-xs text-amber-600">{coins.gold}gp {coins.silver}sp {coins.copper}cp</span>}
                      {totalItems > 0 && <span className="text-xs text-stone-500">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>}
                    </div>
                    <span className="text-stone-600 text-xs">{expandedChar === char.id ? '▲' : '▼'}</span>
                  </button>
                  {expandedChar === char.id && (
                    <div className="border-t border-stone-800 px-4 py-3 space-y-4">
                      {/* Coins */}
                      <div className="space-y-2">
                        <p className="text-xs text-stone-600 uppercase tracking-widest">Coin</p>
                        {(['gold', 'silver', 'copper'] as CoinDenom[]).map(denom => {
                          const colorMap: Record<CoinDenom, string> = { gold: 'text-amber-400', silver: 'text-slate-300', copper: 'text-orange-400' }
                          const abbrMap: Record<CoinDenom, string> = { gold: 'gp', silver: 'sp', copper: 'cp' }
                          return (
                            <CoinRow key={denom} label={denom} abbr={abbrMap[denom]} color={colorMap[denom]} amount={coins[denom]}
                              onDelta={d => {
                                const updated = { ...coins, [denom]: coins[denom] + d }
                                setCharCoinInputs(p => ({ ...p, [char.id]: updated }))
                                void saveCharCoins(char, updated)
                              }}
                              onSet={v => {
                                const updated = { ...coins, [denom]: v }
                                setCharCoinInputs(p => ({ ...p, [char.id]: updated }))
                                void saveCharCoins(char, updated)
                              }} />
                          )
                        })}

                        {/* Character custom currency */}
                        {coins.custom.map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs font-medium w-6 text-right text-violet-400 truncate">{entry.name.slice(0, 3)}</span>
                            <button onClick={() => { const u = { ...coins, custom: coins.custom.map((e, i) => i === idx ? { ...e, amount: e.amount - 10 } : e) }; setCharCoinInputs(p => ({ ...p, [char.id]: u })); void saveCharCoins(char, u) }} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−10</button>
                            <button onClick={() => { const u = { ...coins, custom: coins.custom.map((e, i) => i === idx ? { ...e, amount: e.amount - 1 } : e) }; setCharCoinInputs(p => ({ ...p, [char.id]: u })); void saveCharCoins(char, u) }} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">−1</button>
                            <span className="w-20 text-center text-base font-bold tabular-nums text-violet-300">{entry.amount.toLocaleString()}</span>
                            <button onClick={() => { const u = { ...coins, custom: coins.custom.map((e, i) => i === idx ? { ...e, amount: e.amount + 1 } : e) }; setCharCoinInputs(p => ({ ...p, [char.id]: u })); void saveCharCoins(char, u) }} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+1</button>
                            <button onClick={() => { const u = { ...coins, custom: coins.custom.map((e, i) => i === idx ? { ...e, amount: e.amount + 10 } : e) }; setCharCoinInputs(p => ({ ...p, [char.id]: u })); void saveCharCoins(char, u) }} className="w-7 h-7 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors">+10</button>
                            <span className="text-xs text-stone-400 flex-1">{entry.name}</span>
                            <button onClick={() => { const u = { ...coins, custom: coins.custom.filter((_, i) => i !== idx) }; setCharCoinInputs(p => ({ ...p, [char.id]: u })); void saveCharCoins(char, u) }} className="text-stone-700 hover:text-red-500 text-xs transition-colors">✕</button>
                          </div>
                        ))}

                        {(() => {
                          const customInput = charNewCustom[char.id]
                          return customInput ? (
                            <div className="flex gap-2 items-center">
                              <input placeholder="Name" value={customInput.name} onChange={e => setCharNewCustom(p => ({ ...p, [char.id]: { ...p[char.id], name: e.target.value } }))}
                                className="flex-1 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-violet-500" />
                              <input type="number" min={0} placeholder="0" value={customInput.amount} onChange={e => setCharNewCustom(p => ({ ...p, [char.id]: { ...p[char.id], amount: e.target.value } }))}
                                className="w-14 bg-stone-800 border border-stone-700 rounded px-2 py-1 text-sm text-center font-mono focus:outline-none focus:border-violet-500" />
                              <button onClick={() => {
                                if (!customInput.name.trim()) return
                                const u = { ...coins, custom: [...coins.custom, { name: customInput.name.trim(), amount: parseInt(customInput.amount, 10) || 0 }] }
                                setCharCoinInputs(p => ({ ...p, [char.id]: u }))
                                setCharNewCustom(p => { const n = { ...p }; delete n[char.id]; return n })
                                void saveCharCoins(char, u)
                              }} className="bg-violet-800 hover:bg-violet-700 text-xs text-violet-100 px-2 py-1 rounded transition-colors">Add</button>
                              <button onClick={() => setCharNewCustom(p => { const n = { ...p }; delete n[char.id]; return n })} className="text-stone-500 hover:text-stone-300 text-xs transition-colors">✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setCharNewCustom(p => ({ ...p, [char.id]: { name: '', amount: '0' } }))} className="text-xs text-stone-600 hover:text-violet-400 transition-colors">+ Custom</button>
                          )
                        })()}
                      </div>

                      {/* Loot items */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-stone-600 uppercase tracking-widest">Loot</p>
                        {char.loot.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <span className="text-stone-500 font-mono text-xs">{item.quantity}×</span>
                            <span className="flex-1">{item.name}</span>
                            <button onClick={() => void handleRemoveLoot(char, idx)} className="text-stone-700 hover:text-red-500 text-xs transition-colors">✕</button>
                          </div>
                        ))}
                        {char.loot.length === 0 && <p className="text-xs text-stone-600 italic">No loot</p>}
                        <div className="flex gap-2 pt-1">
                          <input placeholder="Item name" value={lootInputs[char.id]?.name ?? ''}
                            onChange={e => setLootInputs(p => ({ ...p, [char.id]: { ...p[char.id], name: e.target.value } }))}
                            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500" />
                          <input type="number" min={1} placeholder="Qty" value={lootInputs[char.id]?.quantity ?? '1'}
                            onChange={e => setLootInputs(p => ({ ...p, [char.id]: { ...p[char.id], quantity: e.target.value } }))}
                            className="w-14 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-amber-500" />
                          <button onClick={() => void handleAddLoot(char)}
                            className="bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm px-3 py-1.5 rounded-lg transition-colors">Add</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Session Log Section ───────────────────────────────────────────────────────

function SessionLogSection({ campaignId, notes, onRefresh }: {
  campaignId: string; notes: SessionNote[]; onRefresh: () => void
}) {
  const [noteText, setNoteText] = useState('')

  async function handleAdd() {
    if (!noteText.trim()) return
    await fetch('/api/world/session-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, note: noteText.trim(), dmPin: getDmPin() }),
    })
    setNoteText(''); onRefresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/world/session-notes/${id}?dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          placeholder="Add a session note…"
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          rows={3}
          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 resize-none"
        />
        <button onClick={() => void handleAdd()} disabled={!noteText.trim()}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Add Note
        </button>
      </div>

      <div className="space-y-2">
        {notes.length === 0 && <p className="text-xs text-stone-600 italic">No notes yet.</p>}
        {notes.map(n => (
          <div key={n.id} className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 flex gap-3">
            <div className="flex-1">
              <p className="text-sm text-stone-200 whitespace-pre-wrap">{n.note}</p>
              <p className="text-xs text-stone-600 mt-2">
                {new Date(n.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button onClick={() => void handleDelete(n.id)} className="text-stone-700 hover:text-red-500 text-xs shrink-0 transition-colors">✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Type guards ───────────────────────────────────────────────────────────────

// ── Dice Panel ────────────────────────────────────────────────────────────────

function rollExpression(expr: string): number | null {
  const m = expr.trim().match(/^(\d+)d(\d+)([+-]\d+)?$/i)
  if (!m) return null
  let total = m[3] ? parseInt(m[3]) : 0
  const sides = parseInt(m[2])
  for (let i = 0; i < parseInt(m[1]); i++) total += Math.floor(Math.random() * sides) + 1
  return total
}

function DicePanel({ history, onRoll }: { history: RollEntry[]; onRoll: (e: RollEntry) => void }) {
  const [custom, setCustom] = useState('')
  const STD = [4, 6, 8, 10, 12, 20, 100]

  function roll(label: string, expr: string) {
    const result = rollExpression(expr)
    if (result !== null) onRoll({ label, result, timestamp: new Date() })
  }

  function rollCustom() {
    const expr = custom.trim()
    if (!expr) return
    const result = rollExpression(expr) ?? `Invalid: ${expr}`
    onRoll({ label: expr, result, timestamp: new Date() })
  }

  return (
    <div className="border-b border-stone-800 bg-stone-950/80 px-4 py-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {STD.map(d => (
          <button key={d} onClick={() => roll(`d${d}`, `1d${d}`)}
            className="bg-stone-800 hover:bg-amber-700 text-stone-200 text-sm font-bold w-12 h-10 rounded-lg transition-colors">
            d{d}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input placeholder="e.g. 2d6+3" value={custom} onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') rollCustom() }}
          className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-amber-500" />
        <button onClick={rollCustom}
          className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-4 py-1.5 rounded-lg transition-colors">Roll</button>
      </div>
      {history.length > 0 && (
        <div className="flex gap-2 flex-wrap max-h-16 overflow-y-auto">
          {history.map((e, i) => (
            <span key={i} className="text-xs bg-stone-800 text-stone-300 px-2 py-1 rounded-lg font-mono">
              <span className="text-stone-500">{e.label}:</span> <span className="text-amber-400 font-bold">{e.result}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Quest Generator ───────────────────────────────────────────────────────────

type QuestResult = {
  type: string; giver: string; target: string
  location: string; complication: string; reward: string
}

const QUEST_TABLES = {
  types: ['Rescue','Retrieve','Investigate','Eliminate','Escort','Deliver','Explore','Defend','Infiltrate','Negotiate'],
  givers: [
    'A desperate innkeeper','A cloaked noble','A young shepherd','An elderly wizard',
    'A merchant guild rep','A haunted soldier','A mysterious stranger','The local magistrate',
    'A grieving widow','A reformed thief','A traveling bard','A temple priest',
    'A worried farmer','A ship captain','A blind oracle','A child with a strange map',
  ],
  targets: [
    'a stolen artifact','a missing person','an ancient relic','a powerful creature',
    'a dangerous criminal','a corrupt official','a cursed object','a lost shipment',
    'a cache of weapons','a group of refugees','a forbidden tome','a kidnapped heir',
    'a family heirloom','a monster haunting the roads','a spy within the city',
    'a portal that should not exist',
  ],
  locations: [
    'the ruins north of town','deep in the Ashwood Forest','an abandoned mine',
    'a crumbling castle','the sewers beneath the city','a remote mountain pass',
    'a sunken temple','the black market district','an island across the bay',
    'a rival town three days ride away','the cursed swamplands','a hidden valley',
    'a dwarven stronghold','the edge of the known map','a haunted lighthouse',
    'a ship anchored in the fog',
  ],
  complications: [
    'but the quest giver is hiding something',
    'but a rival faction wants the same thing',
    'but time is critically short',
    'but the target is not what it seems',
    'but an old enemy is involved',
    'but innocents will be caught in the crossfire',
    'but magic in the area behaves strangely',
    'but a powerful NPC actively opposes them',
    'but the reward comes with strings attached',
    'but one party member has a personal connection to it',
    'but the information they were given was wrong',
    'but someone in town is already watching them',
    'but the path is far more dangerous than described',
    'but the situation has already changed hands once',
    'but what they find there changes everything',
    'but they are not the only ones who were hired',
  ],
  rewards: [
    '100 gp and local renown','a rare magical item','a noble\'s political favor',
    'a deed to a small property','guild membership','200 gp',
    'a powerful new ally','intelligence on a greater threat','a ship and loyal crew',
    'a debt or past crime forgiven','a legendary weapon','access to forbidden knowledge',
    '500 gp and a minor title','a trained exotic mount','a map to greater treasure',
    'safe passage through dangerous territory',
  ],
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildQuest(): QuestResult {
  return {
    type: pickRandom(QUEST_TABLES.types),
    giver: pickRandom(QUEST_TABLES.givers),
    target: pickRandom(QUEST_TABLES.targets),
    location: pickRandom(QUEST_TABLES.locations),
    complication: pickRandom(QUEST_TABLES.complications),
    reward: pickRandom(QUEST_TABLES.rewards),
  }
}

type GeneratedQuest = QuestResult & { title: string; difficulty: number; isOptional: boolean; saving: boolean; saved: boolean }

function QuestGenerator({ campaignId, onQuestSaved }: { campaignId: string; onQuestSaved?: () => void }) {
  const [count, setCount] = useState(1)
  const [quests, setQuests] = useState<GeneratedQuest[]>([])

  const rows: { key: keyof QuestResult; label: string; table: (typeof QUEST_TABLES)[keyof typeof QUEST_TABLES] }[] = [
    { key: 'type',         label: 'Type',      table: QUEST_TABLES.types },
    { key: 'giver',        label: 'Given by',  table: QUEST_TABLES.givers },
    { key: 'target',       label: 'Objective', table: QUEST_TABLES.targets },
    { key: 'location',     label: 'Location',  table: QUEST_TABLES.locations },
    { key: 'complication', label: 'Twist',     table: QUEST_TABLES.complications },
    { key: 'reward',       label: 'Reward',    table: QUEST_TABLES.rewards },
  ]

  function generate() {
    const n = Math.max(1, Math.min(10, count))
    setQuests(Array.from({ length: n }, () => ({
      ...buildQuest(),
      title: '',
      difficulty: 2,
      isOptional: true,
      saving: false,
      saved: false,
    })))
  }

  function updateField<K extends keyof GeneratedQuest>(idx: number, key: K, value: GeneratedQuest[K]) {
    setQuests(prev => prev.map((q, i) => i === idx ? { ...q, [key]: value } : q))
  }

  async function saveQuest(idx: number) {
    const q = quests[idx]
    const title = q.title.trim() || `${q.type}: ${q.target}`
    updateField(idx, 'saving', true)
    const res = await fetch('/api/world/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        title,
        giver: q.giver,
        objective: q.target,
        location: q.location,
        complications: q.complication,
        reward: q.reward,
        difficulty: q.difficulty,
        questType: q.type,
        isOptional: q.isOptional,
        dmPin: getDmPin(),
      }),
    })
    updateField(idx, 'saving', false)
    if (res.ok) {
      updateField(idx, 'saved', true)
      onQuestSaved?.()
    }
  }

  async function saveAll() {
    const unsaved = quests.map((_, i) => i).filter(i => !quests[i].saved)
    await Promise.all(unsaved.map(i => saveQuest(i)))
  }

  const allSaved = quests.length > 0 && quests.every(q => q.saved)

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500 uppercase tracking-widest">Quest Generator</p>

      {quests.length === 0 ? (
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5">
            <span className="text-xs text-stone-500">Generate</span>
            <input
              type="number" min={1} max={10} value={count}
              onChange={e => setCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
              className="w-10 bg-transparent text-center text-sm font-mono focus:outline-none text-stone-200"
            />
            <span className="text-xs text-stone-500">quest{count !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={generate}
            className="flex-1 border border-dashed border-amber-800/50 rounded-xl py-2 text-sm text-amber-600 hover:text-amber-400 hover:border-amber-700 transition-colors">
            ✦ Generate
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map((q, idx) => (
            <div key={idx} className={`bg-stone-900 border rounded-xl p-4 space-y-2.5 transition-colors ${q.saved ? 'border-emerald-800/50 opacity-70' : 'border-amber-900/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-stone-500 font-medium">#{idx + 1}</span>
                <input
                  type="text"
                  placeholder={`${q.type}: ${q.target}`}
                  value={q.title}
                  onChange={e => updateField(idx, 'title', e.target.value)}
                  className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                />
              </div>
              {rows.map(({ key, label, table }) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-xs text-stone-500 w-20 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-stone-200 flex-1 leading-snug">{q[key]}</span>
                  {!q.saved && (
                    <button
                      onClick={() => updateField(idx, key as keyof QuestResult, pickRandom(table) as never)}
                      className="text-stone-600 hover:text-amber-400 text-xs transition-colors shrink-0 pt-0.5"
                      title={`Re-roll ${label}`}
                    >↺</button>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-stone-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500">Difficulty</span>
                  {[1,2,3,4,5].map(d => (
                    <button key={d} onClick={() => !q.saved && updateField(idx, 'difficulty', d)}
                      className={`w-4 h-4 rounded-sm transition-colors ${d <= q.difficulty ? 'bg-amber-500' : 'bg-stone-700'}`} />
                  ))}
                </div>
                <button
                  onClick={() => !q.saved && updateField(idx, 'isOptional', !q.isOptional)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${q.isOptional ? 'border-stone-600 text-stone-500' : 'border-red-700/50 text-red-400 bg-red-950/30'}`}
                >
                  {q.isOptional ? 'Optional' : 'Required'}
                </button>
                <div className="flex-1" />
                {q.saved ? (
                  <span className="text-xs text-emerald-500 font-medium">✓ Saved</span>
                ) : (
                  <button
                    onClick={() => void saveQuest(idx)}
                    disabled={q.saving}
                    className="text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1 rounded-lg transition-colors"
                  >
                    {q.saving ? '…' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button
              onClick={() => void saveAll()}
              disabled={allSaved}
              className="flex-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium py-2 rounded-lg transition-colors"
            >
              {allSaved ? '✓ All Saved' : 'Save All to Quests'}
            </button>
            <button onClick={() => setQuests([])}
              className="text-stone-500 hover:text-stone-300 text-xs px-3 transition-colors">
              Clear
            </button>
            <button onClick={generate}
              className="text-amber-600 hover:text-amber-400 text-xs px-3 transition-colors">
              Re-roll All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Quests Section ────────────────────────────────────────────────────────────

const DIFFICULTY_LABELS = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Deadly']
const DIFFICULTY_COLORS = ['', 'text-emerald-400', 'text-sky-400', 'text-amber-400', 'text-orange-400', 'text-red-400']

function DifficultyGauge({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1,2,3,4,5].map(d => {
        const colorClass = d <= value
          ? d <= 2 ? 'bg-emerald-500' : d === 3 ? 'bg-amber-500' : d === 4 ? 'bg-orange-500' : 'bg-red-500'
          : 'bg-stone-700'
        return readonly ? (
          <div key={d} className={`w-3.5 h-3.5 rounded-sm ${colorClass}`} />
        ) : (
          <button key={d} type="button" onClick={() => onChange?.(d)}
            className={`w-3.5 h-3.5 rounded-sm transition-colors ${colorClass}`}
          />
        )
      })}
      <span className={`text-xs ml-1 ${DIFFICULTY_COLORS[value] ?? ''}`}>{DIFFICULTY_LABELS[value] ?? ''}</span>
    </div>
  )
}

function QuestsSection({ campaignId, quests, onRefresh }: { campaignId: string; quests: Quest[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const emptyForm = { title: '', description: '', giver: '', objective: '', location: '', complications: '', reward: '', difficulty: 2, questType: '', isOptional: true }
  const [form, setForm] = useState(emptyForm)

  function startEdit(q: Quest) {
    setEditingId(q.id)
    setExpandedId(q.id)
    setForm({
      title: q.title,
      description: q.description ?? '',
      giver: q.giver ?? '',
      objective: q.objective ?? '',
      location: q.location ?? '',
      complications: q.complications ?? '',
      reward: q.reward ?? '',
      difficulty: q.difficulty,
      questType: q.questType ?? '',
      isOptional: q.isOptional,
    })
  }

  async function handleAdd() {
    if (!form.title.trim()) return
    const res = await fetch('/api/world/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, ...form, title: form.title.trim(), dmPin: getDmPin() }),
    })
    if (res.ok) { setForm(emptyForm); setShowForm(false); onRefresh() }
  }

  async function handleEdit(q: Quest) {
    await fetch('/api/world/quests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questId: q.id, ...form, title: form.title.trim(),
        isPublic: q.isPublic, status: q.status,
        dmPin: getDmPin(),
      }),
    })
    setEditingId(null); onRefresh()
  }

  async function handlePublish(q: Quest) {
    await fetch('/api/world/quests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questId: q.id, title: q.title, description: q.description, giver: q.giver,
        objective: q.objective, location: q.location, complications: q.complications,
        reward: q.reward, difficulty: q.difficulty, questType: q.questType,
        isOptional: q.isOptional, isPublic: !q.isPublic,
        status: !q.isPublic ? 'active' : 'draft',
        dmPin: getDmPin(),
      }),
    })
    onRefresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/world/quests?questId=${id}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    onRefresh()
  }

  const fields: { key: keyof typeof emptyForm; label: string; multiline?: boolean }[] = [
    { key: 'title',         label: 'Title' },
    { key: 'questType',     label: 'Type' },
    { key: 'giver',         label: 'Quest Giver' },
    { key: 'objective',     label: 'Objective' },
    { key: 'location',      label: 'Location' },
    { key: 'complications', label: 'Twist / Complication', multiline: true },
    { key: 'reward',        label: 'Reward' },
    { key: 'description',   label: 'Description / Notes', multiline: true },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-500 uppercase tracking-widest">Quests ({quests.length})</p>
        <button onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(emptyForm) }}
          className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
          {showForm ? 'Cancel' : '+ New Quest'}
        </button>
      </div>

      {showForm && (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3">
          <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">New Quest</p>
          {fields.map(f => (
            <div key={f.key}>
              <p className="text-xs text-stone-500 mb-1">{f.label}</p>
              {f.multiline ? (
                <textarea
                  rows={2}
                  value={form[f.key] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key] as string}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          ))}
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-stone-500 mb-1.5">Difficulty</p>
              <DifficultyGauge value={form.difficulty} onChange={v => setForm(p => ({ ...p, difficulty: v }))} />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-stone-500">Requirement</span>
              <button
                onClick={() => setForm(p => ({ ...p, isOptional: !p.isOptional }))}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.isOptional ? 'border-stone-600 text-stone-400' : 'border-red-700/60 bg-red-950/30 text-red-400'}`}
              >
                {form.isOptional ? 'Optional' : 'Required'}
              </button>
            </div>
          </div>
          <button onClick={() => void handleAdd()}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
            Add Quest
          </button>
        </div>
      )}

      {quests.length === 0 && !showForm && (
        <p className="text-sm text-stone-600 italic text-center py-6">No quests yet. Create one or generate from Tables.</p>
      )}

      <div className="space-y-2">
        {quests.map(q => {
          const isExpanded = expandedId === q.id
          const isEditing = editingId === q.id
          return (
            <div key={q.id} className={`rounded-xl border transition-colors ${q.isPublic ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-stone-800 bg-stone-900'}`}>
              <button
                onClick={() => { setExpandedId(isExpanded ? null : q.id); if (isEditing && isExpanded) setEditingId(null) }}
                className="w-full flex items-start gap-3 px-4 py-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{q.title}</p>
                    {q.questType && <span className="text-xs text-stone-500">{q.questType}</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${q.isOptional ? 'border-stone-700 text-stone-500' : 'border-red-800/50 text-red-400 bg-red-950/20'}`}>
                      {q.isOptional ? 'Optional' : 'Required'}
                    </span>
                    {q.isPublic && <span className="text-xs text-emerald-500 font-medium">● Live</span>}
                  </div>
                  <DifficultyGauge value={q.difficulty} readonly />
                </div>
                <span className="text-stone-600 text-xs mt-0.5">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && !isEditing && (
                <div className="px-4 pb-4 border-t border-stone-800/50 pt-3 space-y-2">
                  {q.giver && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Quest Giver</span><span className="text-sm">{q.giver}</span></div>}
                  {q.objective && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Objective</span><span className="text-sm">{q.objective}</span></div>}
                  {q.location && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Location</span><span className="text-sm">{q.location}</span></div>}
                  {q.complications && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Twist</span><span className="text-sm">{q.complications}</span></div>}
                  {q.reward && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Reward</span><span className="text-sm text-amber-300">{q.reward}</span></div>}
                  {q.description && <div className="flex gap-2"><span className="text-xs text-stone-500 w-24 shrink-0">Notes</span><span className="text-sm text-stone-400 italic">{q.description}</span></div>}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => void handlePublish(q)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${q.isPublic ? 'bg-stone-800 hover:bg-red-900/40 text-stone-400 hover:text-red-400 border border-stone-700' : 'bg-emerald-800 hover:bg-emerald-700 text-white'}`}
                    >
                      {q.isPublic ? 'Unpublish from Players' : '↑ Publish to Players'}
                    </button>
                    <button onClick={() => startEdit(q)} className="text-xs text-stone-500 hover:text-amber-400 px-3 transition-colors">Edit</button>
                    <button onClick={() => void handleDelete(q.id)} className="text-xs text-stone-600 hover:text-red-400 px-2 transition-colors">✕</button>
                  </div>
                </div>
              )}

              {isExpanded && isEditing && (
                <div className="px-4 pb-4 border-t border-stone-800/50 pt-3 space-y-3">
                  {fields.map(f => (
                    <div key={f.key}>
                      <p className="text-xs text-stone-500 mb-1">{f.label}</p>
                      {f.multiline ? (
                        <textarea
                          rows={2}
                          value={form[f.key] as string}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none"
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[f.key] as string}
                          onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-stone-500 mb-1.5">Difficulty</p>
                      <DifficultyGauge value={form.difficulty} onChange={v => setForm(p => ({ ...p, difficulty: v }))} />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setForm(p => ({ ...p, isOptional: !p.isOptional }))}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${form.isOptional ? 'border-stone-600 text-stone-400' : 'border-red-700/60 bg-red-950/30 text-red-400'}`}
                      >
                        {form.isOptional ? 'Optional' : 'Required'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => void handleEdit(q)}
                      className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                      Save Changes
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="text-stone-500 hover:text-stone-300 text-xs px-3 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tables Section ────────────────────────────────────────────────────────────

function TablesSection({ campaignId, onQuestSaved }: { campaignId: string; onQuestSaved?: () => void }) {
  const [customTables, setCustomTables] = useState<CustomTable[]>([])
  const [lastRoll, setLastRoll] = useState<{ table: string; result: string } | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEntries, setNewEntries] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEntries, setEditEntries] = useState('')

  const fetchTables = useCallback(async () => {
    const res = await fetch(`/api/world/tables?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isCustomTablesResponse(data)) setCustomTables(data.tables)
  }, [campaignId])

  useEffect(() => { void fetchTables() }, [fetchTables])

  function rollTable(name: string, entries: string[]) {
    if (entries.length === 0) return
    const result = entries[Math.floor(Math.random() * entries.length)]
    setLastRoll({ table: name, result })
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const entries = newEntries.split('\n').map(e => e.trim()).filter(Boolean)
    await fetch('/api/world/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, name: newName.trim(), entries, dmPin: getDmPin() }),
    })
    setNewName(''); setNewEntries(''); setShowNewForm(false); void fetchTables()
  }

  async function handleEdit(t: CustomTable) {
    const entries = editEntries.split('\n').map(e => e.trim()).filter(Boolean)
    await fetch(`/api/world/tables/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), entries, dmPin: getDmPin() }),
    })
    setEditingId(null); void fetchTables()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/world/tables/${id}?dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    void fetchTables()
  }

  return (
    <div className="space-y-4">
      <QuestGenerator campaignId={campaignId} onQuestSaved={onQuestSaved} />
      {lastRoll && (
        <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-500 uppercase tracking-widest">{lastRoll.table}</p>
            <p className="font-semibold text-amber-300 mt-0.5">{lastRoll.result}</p>
          </div>
          <button onClick={() => setLastRoll(null)} className="text-stone-600 hover:text-stone-400 text-xs">✕</button>
        </div>
      )}

      <div>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Built-in Tables</p>
        <div className="space-y-2">
          {Object.entries(BUILT_IN_TABLES).map(([key, t]) => (
            <div key={key} className="flex items-center justify-between bg-stone-900 border border-stone-800 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-stone-500">{t.entries.length} entries</p>
              </div>
              <button onClick={() => rollTable(t.label, t.entries)}
                className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                Roll
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Custom Tables</p>
        <div className="space-y-2">
          {customTables.map(t => (
            <div key={t.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              {editingId === t.id ? (
                <div className="px-4 py-3 space-y-2">
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
                  <textarea value={editEntries} onChange={e => setEditEntries(e.target.value)} rows={4}
                    placeholder="One entry per line"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none font-mono" />
                  <div className="flex gap-2">
                    <button onClick={() => void handleEdit(t)} className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm py-1.5 rounded-lg transition-colors">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-stone-500 hover:text-stone-300 text-sm px-3 transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.entries.length} entries</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => rollTable(t.name, t.entries)}
                      className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Roll</button>
                    <button onClick={() => { setEditingId(t.id); setEditName(t.name); setEditEntries(t.entries.join('\n')) }}
                      className="text-stone-500 hover:text-stone-300 text-xs transition-colors">Edit</button>
                    <button onClick={() => void handleDelete(t.id)} className="text-stone-600 hover:text-red-500 text-xs transition-colors">✕</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {showNewForm ? (
          <div className="mt-2 bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 space-y-2">
            <input placeholder="Table name" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            <textarea placeholder="One entry per line" value={newEntries} onChange={e => setNewEntries(e.target.value)} rows={5}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 resize-none font-mono" />
            <div className="flex gap-2">
              <button onClick={() => void handleCreate()} className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm py-1.5 rounded-lg transition-colors">Create</button>
              <button onClick={() => { setShowNewForm(false); setNewName(''); setNewEntries('') }} className="text-stone-500 hover:text-stone-300 text-sm px-3 transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewForm(true)}
            className="mt-2 w-full border border-dashed border-stone-700 rounded-xl py-3 text-sm text-stone-500 hover:text-stone-300 hover:border-stone-500 transition-colors">
            + New custom table
          </button>
        )}
      </div>
    </div>
  )
}

// ── Encounter Gauge Tab ───────────────────────────────────────────────────────

const DAMAGE_TYPES: DamageType[] = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force',
  'lightning', 'necrotic', 'piercing', 'poison',
  'psychic', 'radiant', 'slashing', 'thunder',
]

const CONDITION_IMMUNITY_TYPES: ConditionImmunityType[] = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious',
]

const CR_OPTIONS = [
  '0', '1/8', '1/4', '1/2',
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
]

const ABILITY_KEYS: (keyof Monster['abilityScores'])[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function defaultMonster(): Monster {
  return {
    name: '',
    cr: '1',
    hp: 10,
    ac: 13,
    speed: '30 ft.',
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: '',
    damageImmunities: [],
    conditionImmunities: [],
    senses: '',
    legendaryActions: false,
    lairActions: false,
    legendaryResistance: false,
  }
}

function GaugeBar({ score }: { score: number }) {
  const pct = ((score - 1) / 9) * 100
  const barColor =
    score <= 2 ? 'bg-emerald-500' :
    score <= 3.5 ? 'bg-green-500' :
    score <= 5 ? 'bg-yellow-500' :
    score <= 6.5 ? 'bg-orange-500' :
    score <= 7.5 ? 'bg-red-500' :
    score <= 9 ? 'bg-red-700' :
    'bg-stone-900'

  return (
    <div className="relative h-4 bg-stone-800 rounded-full overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center">
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <div key={n} className="flex-1 flex justify-end pr-px">
            {n < 10 && <div className="w-px h-2.5 bg-stone-950/40" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonsterGroupForm({
  group,
  expanded,
  onToggle,
  onChange,
  onRemove,
}: {
  group: MonsterGroup
  expanded: boolean
  onToggle: () => void
  onChange: (updated: MonsterGroup) => void
  onRemove: () => void
}) {
  const m = group.monster

  function updateMonster(patch: Partial<Monster>) {
    onChange({ ...group, monster: { ...m, ...patch } })
  }

  function toggleDmgImmunity(dt: DamageType) {
    const next = m.damageImmunities.includes(dt)
      ? m.damageImmunities.filter(x => x !== dt)
      : [...m.damageImmunities, dt]
    updateMonster({ damageImmunities: next })
  }

  function toggleCondImmunity(ct: ConditionImmunityType) {
    const next = m.conditionImmunities.includes(ct)
      ? m.conditionImmunities.filter(x => x !== ct)
      : [...m.conditionImmunities, ct]
    updateMonster({ conditionImmunities: next })
  }

  const inputCls = 'bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-amber-500'

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onToggle} className="flex-1 flex items-center gap-3 text-left min-w-0">
          <span className="text-stone-400 text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
          <span className="font-medium text-sm truncate">{m.name || 'Unnamed Monster'}</span>
          <span className="text-stone-500 text-xs shrink-0">CR {m.cr}</span>
          <span className="text-stone-500 text-xs shrink-0">AC {m.ac}</span>
          <span className="text-stone-500 text-xs shrink-0">HP {m.hp}</span>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-stone-500">×</span>
          <input
            type="number"
            min={1}
            max={99}
            value={group.count}
            onChange={e => onChange({ ...group, count: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-12 text-center bg-stone-800 border border-stone-700 rounded-lg px-1 py-1 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
        <button onClick={onRemove} className="text-stone-600 hover:text-red-500 text-sm transition-colors shrink-0">✕</button>
      </div>

      {/* Expanded stat block form */}
      {expanded && (
        <div className="border-t border-stone-800 px-3 py-3 space-y-3">
          {/* Name / CR / HP / AC / Speed */}
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Monster name" value={m.name}
              onChange={e => updateMonster({ name: e.target.value })}
              className={`col-span-2 ${inputCls}`} />
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 shrink-0">CR</label>
              <select value={m.cr} onChange={e => updateMonster({ cr: e.target.value })}
                className={`flex-1 ${inputCls}`}>
                {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{cr}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 shrink-0">AC</label>
              <input type="number" min={1} max={30} value={m.ac}
                onChange={e => updateMonster({ ac: parseInt(e.target.value) || 0 })}
                className={`flex-1 ${inputCls}`} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 shrink-0">HP</label>
              <input type="number" min={1} value={m.hp}
                onChange={e => updateMonster({ hp: parseInt(e.target.value) || 0 })}
                className={`flex-1 ${inputCls}`} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-stone-500 shrink-0">Speed</label>
              <input placeholder="30 ft." value={m.speed}
                onChange={e => updateMonster({ speed: e.target.value })}
                className={`flex-1 ${inputCls}`} />
            </div>
          </div>

          {/* Ability scores */}
          <div>
            <p className="text-xs text-stone-500 mb-1.5">Ability Scores</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
              {ABILITY_KEYS.map(key => (
                <div key={key}>
                  <p className="text-xs text-stone-500 uppercase mb-1">{key}</p>
                  <input type="number" min={1} max={30} value={m.abilityScores[key]}
                    onChange={e => updateMonster({ abilityScores: { ...m.abilityScores, [key]: parseInt(e.target.value) || 10 } })}
                    className="w-full text-center bg-stone-800 border border-stone-700 rounded-lg py-1 text-sm focus:outline-none focus:border-amber-500" />
                  <p className="text-xs text-stone-400 mt-0.5">{abilityMod(m.abilityScores[key])}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Senses */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-500">Skills</label>
              <input placeholder="Perception +5, Stealth +3…" value={m.skills}
                onChange={e => updateMonster({ skills: e.target.value })}
                className={`mt-1 w-full ${inputCls}`} />
            </div>
            <div>
              <label className="text-xs text-stone-500">Senses</label>
              <input placeholder="Darkvision 60 ft." value={m.senses}
                onChange={e => updateMonster({ senses: e.target.value })}
                className={`mt-1 w-full ${inputCls}`} />
            </div>
          </div>

          {/* Damage immunities */}
          <div>
            <p className="text-xs text-stone-500 mb-1.5">Damage Immunities</p>
            <div className="flex flex-wrap gap-1.5">
              {DAMAGE_TYPES.map(dt => (
                <button key={dt} onClick={() => toggleDmgImmunity(dt)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                    m.damageImmunities.includes(dt)
                      ? 'bg-red-900/50 border-red-700 text-red-300'
                      : 'border-stone-700 text-stone-500 hover:text-stone-300'
                  }`}>
                  {dt}
                </button>
              ))}
            </div>
          </div>

          {/* Condition immunities */}
          <div>
            <p className="text-xs text-stone-500 mb-1.5">Condition Immunities</p>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_IMMUNITY_TYPES.map(ct => (
                <button key={ct} onClick={() => toggleCondImmunity(ct)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                    m.conditionImmunities.includes(ct)
                      ? 'bg-purple-900/50 border-purple-700 text-purple-300'
                      : 'border-stone-700 text-stone-500 hover:text-stone-300'
                  }`}>
                  {ct}
                </button>
              ))}
            </div>
          </div>

          {/* Special traits */}
          <div className="flex flex-wrap gap-4">
            {([
              ['legendaryActions', 'Legendary Actions'],
              ['lairActions', 'Lair Actions'],
              ['legendaryResistance', 'Legendary Resistance'],
            ] as [keyof Pick<Monster, 'legendaryActions' | 'lairActions' | 'legendaryResistance'>, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={m[key]}
                  onChange={e => updateMonster({ [key]: e.target.checked })}
                  className="accent-amber-500 w-4 h-4" />
                <span className="text-sm text-stone-300">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EncounterTab({
  characters,
  monsterGroups,
  difficulty,
  onGroupsChange,
}: {
  characters: Character[]
  monsterGroups: MonsterGroup[]
  difficulty: EncounterDifficulty | null
  onGroupsChange: (groups: MonsterGroup[]) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const activeChars = characters.filter(c => c.isActive)
  const party = activeChars.length > 0 ? activeChars : characters
  const totalMaxHp = party.reduce((s, c) => s + c.maxHp, 0)
  const totalCurrentHp = party.reduce((s, c) => s + c.currentHp, 0)

  function addMonster() {
    const id = crypto.randomUUID()
    const newGroup: MonsterGroup = { id, monster: defaultMonster(), count: 1 }
    onGroupsChange([...monsterGroups, newGroup])
    setExpandedId(id)
  }

  function updateGroup(id: string, updated: MonsterGroup) {
    onGroupsChange(monsterGroups.map(g => g.id === id ? updated : g))
  }

  function removeGroup(id: string) {
    onGroupsChange(monsterGroups.filter(g => g.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="space-y-5">
      {/* Party summary */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
        <div>
          <p className="text-xs text-stone-500">Party</p>
          <p className="text-sm font-medium">{party.length} player{party.length !== 1 ? 's' : ''}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Avg Level</p>
          <p className="text-sm font-medium">
            {party.length > 0
              ? (party.reduce((s, c) => s + c.level, 0) / party.length).toFixed(1)
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Party HP</p>
          <p className="text-sm font-medium">
            {totalCurrentHp} / {totalMaxHp}
            {totalMaxHp > 0 && (
              <span className={`ml-1.5 text-xs ${totalCurrentHp / totalMaxHp < 0.4 ? 'text-red-400' : totalCurrentHp / totalMaxHp < 0.7 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                ({Math.round((totalCurrentHp / totalMaxHp) * 100)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Monster list */}
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-widest mb-2">Monsters</p>
        <div className="space-y-2">
          {monsterGroups.map(g => (
            <MonsterGroupForm
              key={g.id}
              group={g}
              expanded={expandedId === g.id}
              onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
              onChange={updated => updateGroup(g.id, updated)}
              onRemove={() => removeGroup(g.id)}
            />
          ))}
        </div>
        <button onClick={addMonster}
          className="mt-2 w-full border border-dashed border-stone-700 rounded-xl py-3 text-sm text-stone-500 hover:text-stone-300 hover:border-stone-500 transition-colors">
          + Add Monster
        </button>
      </div>

      {/* Gauge */}
      {difficulty ? (
        <div className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-4 space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-xs text-stone-500 uppercase tracking-widest">Encounter Rating</p>
            <p className="text-xs text-stone-500">{difficulty.breakdown.adjustedXP.toLocaleString()} adj. XP</p>
          </div>

          <GaugeBar score={difficulty.score} />

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tabular-nums ${difficulty.colorClass}`}>{difficulty.score.toFixed(1)}</span>
              <span className={`text-sm font-semibold ${difficulty.colorClass}`}>{difficulty.label}</span>
            </div>
            <div className="text-right text-xs text-stone-500">
              <p>Deadly threshold</p>
              <p className="text-stone-300">{difficulty.breakdown.partyDeadlyThreshold.toLocaleString()} XP</p>
            </div>
          </div>

          <button onClick={() => setShowBreakdown(v => !v)}
            className="text-xs text-stone-500 hover:text-stone-300 transition-colors">
            {showBreakdown ? '▲' : '▼'} Score breakdown
          </button>

          {showBreakdown && (
            <div className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2.5 space-y-1.5 text-xs">
              {([
                ['XP-based',      difficulty.breakdown.xpScore],
                ['AC difficulty', difficulty.breakdown.acPenalty],
                ['Immunities',    difficulty.breakdown.immunityBonus],
                ['Party health',  difficulty.breakdown.hpPenalty],
                ['Special traits',difficulty.breakdown.specialBonus],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-stone-500">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-600 rounded-full"
                        style={{ width: `${Math.min(100, (val / 10) * 100)}%` }} />
                    </div>
                    <span className="text-stone-300 w-6 text-right">{val > 0 && label !== 'XP-based' ? '+' : ''}{val.toFixed(1)}</span>
                  </div>
                </div>
              ))}
              <div className="border-t border-stone-800 pt-1.5 flex justify-between">
                <span className="text-stone-500">Total (clamped 1–10)</span>
                <span className={`font-bold ${difficulty.colorClass}`}>{difficulty.score.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      ) : monsterGroups.length > 0 && characters.length === 0 ? (
        <div className="text-center py-8 text-stone-500 text-sm">Add players to the campaign to calculate difficulty.</div>
      ) : monsterGroups.length === 0 ? (
        <div className="bg-stone-900 border border-dashed border-stone-700 rounded-xl px-4 py-8 text-center">
          <p className="text-stone-500 text-sm">Add monsters above to see the encounter rating.</p>
          <p className="text-stone-600 text-xs mt-1">Rating factors in party level, AC, immunities, and current HP.</p>
        </div>
      ) : null}
    </div>
  )
}

function isCustomTablesResponse(v: unknown): v is { tables: CustomTable[] } {
  return typeof v === 'object' && v !== null && 'tables' in v && Array.isArray((v as Record<string, unknown>).tables)
}

function isNpcsResponse(v: unknown): v is { npcs: Npc[] } {
  return typeof v === 'object' && v !== null && 'npcs' in v && Array.isArray((v as Record<string, unknown>).npcs)
}
function isLocationsResponse(v: unknown): v is { locations: Location[] } {
  return typeof v === 'object' && v !== null && 'locations' in v && Array.isArray((v as Record<string, unknown>).locations)
}
function isSessionNotesResponse(v: unknown): v is { notes: SessionNote[] } {
  return typeof v === 'object' && v !== null && 'notes' in v && Array.isArray((v as Record<string, unknown>).notes)
}
function isInventoryResponse(v: unknown): v is { gold: number; silver?: number; copper?: number; customCurrency?: CustomCurrencyEntry[]; sharedItems: InventoryItem[] } {
  return typeof v === 'object' && v !== null && 'gold' in v && 'sharedItems' in v
}
function isQuestsResponse(v: unknown): v is { quests: Quest[] } {
  return typeof v === 'object' && v !== null && 'quests' in v && Array.isArray((v as Record<string, unknown>).quests)
}

function isRosterResponse(v: unknown): v is { characters: Character[] } {
  return typeof v === 'object' && v !== null && 'characters' in v && Array.isArray((v as Record<string, unknown>).characters)
}
function isDrawResponse(v: unknown): v is { fateEvent: FateEvent; pushSent: boolean } {
  return typeof v === 'object' && v !== null && 'fateEvent' in v
}
function isFateLogResponse(v: unknown): v is { events: FateEvent[] } {
  return typeof v === 'object' && v !== null && 'events' in v && Array.isArray((v as Record<string, unknown>).events)
}
function isCombatSessionResponse(v: unknown): v is { session: CombatSession | null } {
  return typeof v === 'object' && v !== null && 'session' in v
}
function isStartCombatResponse(v: unknown): v is { session: CombatSession } {
  return typeof v === 'object' && v !== null && 'session' in v && (v as Record<string, unknown>).session !== null
}
function isNextTurnResponse(v: unknown): v is { session: CombatSession } {
  return typeof v === 'object' && v !== null && 'session' in v && (v as Record<string, unknown>).session !== null
}
function isInitiativeRequestResponse(v: unknown): v is { request: InitiativeRequest | null } {
  return typeof v === 'object' && v !== null && 'request' in v
}
function isInitiativeRequestApiResponse(v: unknown): v is { request: InitiativeRequest } {
  return typeof v === 'object' && v !== null && 'request' in v && (v as Record<string, unknown>).request !== null
}
function isMapsResponse(v: unknown): v is { maps: CampaignMap[]; mapAccessGranted: boolean; sharedMapIds: string[]; mapViewport: MapViewport | null } {
  return typeof v === 'object' && v !== null && 'maps' in v && Array.isArray((v as Record<string, unknown>).maps)
}

function isBattleMapsResponse(v: unknown): v is { maps: BattleMap[]; battleMapAccessGranted: boolean; sharedBattleMapIds: string[]; battleMapViewport: MapViewport | null } {
  return typeof v === 'object' && v !== null && 'maps' in v && Array.isArray((v as Record<string, unknown>).maps)
}

// ── Maps Tab ──────────────────────────────────────────────────────────────────

const MAP_TYPE_LABELS: Record<MapType, string> = { town: 'Town', city: 'City', world: 'World', dungeon: 'Dungeon' }
const MAP_TYPE_COLORS: Record<MapType, string> = {
  town: 'text-emerald-400 bg-emerald-950/50 border-emerald-900/50',
  city: 'text-blue-400 bg-blue-950/50 border-blue-900/50',
  world: 'text-violet-400 bg-violet-950/50 border-violet-900/50',
  dungeon: 'text-red-400 bg-red-950/50 border-red-900/50',
}

function MapsTab({ campaignId }: { campaignId: string }) {
  const [maps, setMaps] = useState<CampaignMap[]>([])
  const [mapAccessGranted, setMapAccessGranted] = useState(false)
  const [sharedMapIds, setSharedMapIds] = useState<string[]>([])
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState<MapType>('dungeon')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [viewportTarget, setViewportTarget] = useState<CampaignMap | null>(null)

  const loadMaps = useCallback(async () => {
    const res = await fetch(`/api/world/maps?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isMapsResponse(data)) {
      setMaps(data.maps)
      setMapAccessGranted(data.mapAccessGranted)
      setSharedMapIds(data.sharedMapIds)
      setMapViewport(data.mapViewport)
    }
    setLoading(false)
  }, [campaignId])

  useEffect(() => { void loadMaps() }, [loadMaps])

  async function handleUpload() {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', uploadFile)
    fd.append('campaignId', campaignId)
    fd.append('name', uploadName.trim())
    fd.append('type', uploadType)
    fd.append('dmPin', getDmPin() ?? '')
    await fetch('/api/world/maps', { method: 'POST', body: fd })
    setUploadFile(null); setUploadName(''); setUploading(false)
    void loadMaps()
  }

  async function handleDelete(map: CampaignMap) {
    await fetch(`/api/world/maps/${map.id}?storagePath=${encodeURIComponent(map.storagePath)}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    const newShared = sharedMapIds.filter(id => id !== map.id)
    const newViewport = mapViewport?.mapId === map.id ? null : mapViewport
    await saveAccess(mapAccessGranted, newShared, newViewport)
    void loadMaps()
  }

  async function toggleShare(mapId: string) {
    const newShared = sharedMapIds.includes(mapId)
      ? sharedMapIds.filter(id => id !== mapId)
      : [...sharedMapIds, mapId]
    await saveAccess(mapAccessGranted, newShared, mapViewport)
    setSharedMapIds(newShared)
  }

  async function toggleAccess() {
    const next = !mapAccessGranted
    await saveAccess(next, sharedMapIds, mapViewport)
    setMapAccessGranted(next)
  }

  async function saveAccess(granted: boolean, shared: string[], viewport: MapViewport | null) {
    await fetch('/api/world/maps/access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, mapAccessGranted: granted, sharedMapIds: shared, mapViewport: viewport, dmPin: getDmPin() }),
    })
  }

  async function handleViewportConfirm(viewport: MapViewport) {
    setMapViewport(viewport)
    await saveAccess(mapAccessGranted, sharedMapIds, viewport)
    setViewportTarget(null)
  }

  if (loading) return <p className="text-stone-400 text-center py-8">Loading maps…</p>

  return (
    <div className="space-y-6">
      {/* Access toggle */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-stone-200">Party Map Access</p>
          <p className="text-xs text-stone-500 mt-0.5">Grant players the Map tab in their panel</p>
        </div>
        <button
          onClick={() => void toggleAccess()}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mapAccessGranted
              ? 'bg-red-900/60 border border-red-800 text-red-300 hover:bg-red-900'
              : 'bg-amber-900/60 border border-amber-800 text-amber-300 hover:bg-amber-900'
          }`}
        >
          {mapAccessGranted ? 'Revoke Access' : 'Grant Access'}
        </button>
      </div>

      {/* Upload form */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-stone-200">Upload Map</h3>
        <input
          type="text"
          placeholder="Map name"
          value={uploadName}
          onChange={e => setUploadName(e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <div className="flex gap-2">
          {(['town', 'city', 'world', 'dungeon'] as MapType[]).map(t => (
            <button
              key={t}
              onClick={() => setUploadType(t)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                uploadType === t ? MAP_TYPE_COLORS[t] : 'border-stone-700 text-stone-500 hover:text-stone-300'
              }`}
            >
              {MAP_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          uploadFile ? 'border-amber-700 bg-amber-950/20' : 'border-stone-700 hover:border-stone-600'
        }`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-sm text-stone-400">
            {uploadFile ? uploadFile.name : 'Click to select image (JPEG, PNG, WebP, GIF — max 10 MB)'}
          </span>
        </label>
        <button
          onClick={() => void handleUpload()}
          disabled={!uploadFile || !uploadName.trim() || uploading}
          className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Map list */}
      {maps.length === 0 ? (
        <p className="text-stone-500 text-center py-4 text-sm">No maps uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          <h3 className="font-medium text-stone-200">Uploaded Maps</h3>
          {maps.map(map => {
            const isShared = sharedMapIds.includes(map.id)
            const hasViewport = mapViewport?.mapId === map.id
            return (
              <div key={map.id} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded overflow-hidden bg-stone-800 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={map.imageUrl} alt={map.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-200 truncate">{map.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${MAP_TYPE_COLORS[map.type]}`}>
                        {MAP_TYPE_LABELS[map.type]}
                      </span>
                      {hasViewport && (
                        <span className="text-xs px-1.5 py-0.5 rounded border text-amber-400 bg-amber-950/50 border-amber-900/50">
                          Viewport set
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => void toggleShare(map.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          isShared
                            ? 'bg-emerald-900/50 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                            : 'border-stone-700 text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {isShared ? 'Shared' : 'Share'}
                      </button>
                      <button
                        onClick={() => setViewportTarget(map)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {hasViewport ? 'Edit Viewport' : 'Set Viewport'}
                      </button>
                      {hasViewport && (
                        <button
                          onClick={() => void (async () => {
                            const newVp = null
                            setMapViewport(newVp)
                            await saveAccess(mapAccessGranted, sharedMapIds, newVp)
                          })()}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-red-400 transition-colors"
                        >
                          Clear Viewport
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(map)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Viewport selector modal */}
      {viewportTarget && (
        <ViewportSelector
          map={viewportTarget}
          existing={mapViewport?.mapId === viewportTarget.id ? mapViewport : null}
          onConfirm={vp => void handleViewportConfirm(vp)}
          onCancel={() => setViewportTarget(null)}
        />
      )}
    </div>
  )
}

function BattleMapsTab({ campaignId, characters }: { campaignId: string; characters: Character[] }) {
  const [maps, setMaps] = useState<BattleMap[]>([])
  const [mapAccessGranted, setMapAccessGranted] = useState(false)
  const [sharedMapIds, setSharedMapIds] = useState<string[]>([])
  const [mapViewport, setMapViewport] = useState<MapViewport | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState<MapType>('dungeon')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [viewportTarget, setViewportTarget] = useState<BattleMap | null>(null)
  const [editingMap, setEditingMap] = useState<BattleMap | null>(null)

  const loadMaps = useCallback(async () => {
    const res = await fetch(`/api/world/battle-maps?campaignId=${campaignId}`)
    const data: unknown = await res.json()
    if (isBattleMapsResponse(data)) {
      setMaps(data.maps)
      setMapAccessGranted(data.battleMapAccessGranted)
      setSharedMapIds(data.sharedBattleMapIds)
      setMapViewport(data.battleMapViewport)
    }
    setLoading(false)
  }, [campaignId])

  useEffect(() => { void loadMaps() }, [loadMaps])

  async function handleUpload() {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', uploadFile)
    fd.append('campaignId', campaignId)
    fd.append('name', uploadName.trim())
    fd.append('type', uploadType)
    fd.append('dmPin', getDmPin() ?? '')
    await fetch('/api/world/battle-maps', { method: 'POST', body: fd })
    setUploadFile(null); setUploadName(''); setUploading(false)
    void loadMaps()
  }

  async function handleDelete(map: BattleMap) {
    await fetch(`/api/world/battle-maps/${map.id}?storagePath=${encodeURIComponent(map.storagePath)}&dmPin=${encodeURIComponent(getDmPin() ?? '')}`, { method: 'DELETE' })
    const newShared = sharedMapIds.filter(id => id !== map.id)
    const newViewport = mapViewport?.mapId === map.id ? null : mapViewport
    await saveAccess(mapAccessGranted, newShared, newViewport)
    void loadMaps()
  }

  async function toggleShare(mapId: string) {
    const newShared = sharedMapIds.includes(mapId)
      ? sharedMapIds.filter(id => id !== mapId)
      : [...sharedMapIds, mapId]
    await saveAccess(mapAccessGranted, newShared, mapViewport)
    setSharedMapIds(newShared)
  }

  async function toggleAccess() {
    const next = !mapAccessGranted
    await saveAccess(next, sharedMapIds, mapViewport)
    setMapAccessGranted(next)
  }

  async function saveAccess(granted: boolean, shared: string[], viewport: MapViewport | null) {
    await fetch('/api/world/battle-maps/access', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, battleMapAccessGranted: granted, sharedBattleMapIds: shared, battleMapViewport: viewport, dmPin: getDmPin() }),
    })
  }

  async function handleViewportConfirm(viewport: MapViewport) {
    setMapViewport(viewport)
    await saveAccess(mapAccessGranted, sharedMapIds, viewport)
    setViewportTarget(null)
  }

  if (loading) return <p className="text-stone-400 text-center py-8">Loading battle maps…</p>

  return (
    <div className="space-y-6">
      {/* Access toggle */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-stone-200">Party Battle Map Access</p>
          <p className="text-xs text-stone-500 mt-0.5">Grant players the Battle Map tab in their panel</p>
        </div>
        <button
          onClick={() => void toggleAccess()}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mapAccessGranted
              ? 'bg-red-900/60 border border-red-800 text-red-300 hover:bg-red-900'
              : 'bg-amber-900/60 border border-amber-800 text-amber-300 hover:bg-amber-900'
          }`}
        >
          {mapAccessGranted ? 'Revoke Access' : 'Grant Access'}
        </button>
      </div>

      {/* Upload form */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-3">
        <h3 className="font-medium text-stone-200">Upload Battle Map</h3>
        <input
          type="text"
          placeholder="Map name"
          value={uploadName}
          onChange={e => setUploadName(e.target.value)}
          className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 placeholder-stone-500"
        />
        <div className="flex gap-2">
          {(['town', 'city', 'world', 'dungeon'] as MapType[]).map(t => (
            <button
              key={t}
              onClick={() => setUploadType(t)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${
                uploadType === t ? MAP_TYPE_COLORS[t] : 'border-stone-700 text-stone-500 hover:text-stone-300'
              }`}
            >
              {MAP_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <label className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          uploadFile ? 'border-amber-700 bg-amber-950/20' : 'border-stone-700 hover:border-stone-600'
        }`}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <span className="text-sm text-stone-400">
            {uploadFile ? uploadFile.name : 'Click to select image (JPEG, PNG, WebP, GIF — max 10 MB)'}
          </span>
        </label>
        <button
          onClick={() => void handleUpload()}
          disabled={!uploadFile || !uploadName.trim() || uploading}
          className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Map list */}
      {maps.length === 0 ? (
        <p className="text-stone-500 text-center py-4 text-sm">No battle maps uploaded yet.</p>
      ) : (
        <div className="space-y-3">
          <h3 className="font-medium text-stone-200">Uploaded Battle Maps</h3>
          {maps.map(map => {
            const isShared = sharedMapIds.includes(map.id)
            const hasViewport = mapViewport?.mapId === map.id
            return (
              <div key={map.id} className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded overflow-hidden bg-stone-800 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={map.imageUrl} alt={map.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-200 truncate">{map.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${MAP_TYPE_COLORS[map.type]}`}>
                        {MAP_TYPE_LABELS[map.type]}
                      </span>
                      {hasViewport && (
                        <span className="text-xs px-1.5 py-0.5 rounded border text-amber-400 bg-amber-950/50 border-amber-900/50">
                          Viewport set
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => setEditingMap(map)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-amber-800 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 transition-colors"
                      >
                        ⚔ Open Battle View
                      </button>
                      <button
                        onClick={() => void toggleShare(map.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                          isShared
                            ? 'bg-emerald-900/50 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                            : 'border-stone-700 text-stone-500 hover:text-stone-300'
                        }`}
                      >
                        {isShared ? 'Shared' : 'Share'}
                      </button>
                      <button
                        onClick={() => setViewportTarget(map)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-stone-300 transition-colors"
                      >
                        {hasViewport ? 'Edit Viewport' : 'Set Viewport'}
                      </button>
                      {hasViewport && (
                        <button
                          onClick={() => void (async () => {
                            const newVp = null
                            setMapViewport(newVp)
                            await saveAccess(mapAccessGranted, sharedMapIds, newVp)
                          })()}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-red-400 transition-colors"
                        >
                          Clear Viewport
                        </button>
                      )}
                      <button
                        onClick={() => void handleDelete(map)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Viewport selector modal */}
      {viewportTarget && (
        <ViewportSelector
          map={viewportTarget}
          existing={mapViewport?.mapId === viewportTarget.id ? mapViewport : null}
          onConfirm={vp => void handleViewportConfirm(vp)}
          onCancel={() => setViewportTarget(null)}
        />
      )}

      {editingMap && (
        <BattleMapEditor
          campaignId={campaignId}
          battleMap={editingMap}
          characters={characters}
          onClose={() => setEditingMap(null)}
        />
      )}
    </div>
  )
}

// ── Viewport Selector Modal ───────────────────────────────────────────────────

type DrawMode = 'rect' | 'circle' | 'polygon'

function ViewportSelector({
  map,
  existing,
  onConfirm,
  onCancel,
}: {
  map: CampaignMap
  existing: MapViewport | null
  onConfirm: (vp: MapViewport) => void
  onCancel: () => void
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [drawMode, setDrawMode] = useState<DrawMode>('rect')
  const [drawing, setDrawing] = useState(false)
  // Pixel coordinates used during drawing
  const [startPx, setStartPx] = useState({ x: 0, y: 0 })
  const [currentPx, setCurrentPx] = useState({ x: 0, y: 0 })
  const [polygonPx, setPolygonPx] = useState<{ x: number; y: number }[]>([])
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 })
  const [draft, setDraft] = useState<MapViewport | null>(existing)

  // Track container pixel size for accurate SVG drawing
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    const r = el.getBoundingClientRect()
    setContainerSize({ w: r.width || 1, h: r.height || 1 })
    return () => ro.disconnect()
  }, [])

  function toPx(point: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(rect.width, point.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, point.clientY - rect.top)),
    }
  }

  function pxToNorm(px: { x: number; y: number }) {
    return { x: px.x / containerSize.w, y: px.y / containerSize.h }
  }

  function normToPx(n: { x: number; y: number }) {
    return { x: n.x * containerSize.w, y: n.y * containerSize.h }
  }

  function handleDrawStart(pt: { x: number; y: number }) {
    if (drawMode === 'polygon') {
      setPolygonPx(prev => [...prev, pt])
      return
    }
    setDrawing(true)
    setStartPx(pt)
    setCurrentPx(pt)
  }

  function handleDrawMove(pt: { x: number; y: number }) {
    if (!drawing || drawMode === 'polygon') return
    setCurrentPx(pt)
  }

  function handleDrawEnd(endPx: { x: number; y: number }) {
    if (!drawing || drawMode === 'polygon') return
    setDrawing(false)
    if (drawMode === 'rect') {
      const x = Math.min(startPx.x, endPx.x) / containerSize.w
      const y = Math.min(startPx.y, endPx.y) / containerSize.h
      const width = Math.abs(endPx.x - startPx.x) / containerSize.w
      const height = Math.abs(endPx.y - startPx.y) / containerSize.h
      setDraft({ mapId: map.id, shape: 'rect', x, y, width, height })
    } else {
      // Circle: radius in normalized coords (relative to width for visual circularity)
      const cx = startPx.x / containerSize.w
      const cy = startPx.y / containerSize.h
      const rPx = Math.sqrt((endPx.x - startPx.x) ** 2 + (endPx.y - startPx.y) ** 2)
      const r = rPx / containerSize.w
      setDraft({ mapId: map.id, shape: 'circle', cx, cy, r })
    }
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    handleDrawStart(toPx(e))
  }

  function onMouseMove(e: React.MouseEvent) {
    handleDrawMove(toPx(e))
  }

  function onMouseUp(e: React.MouseEvent) {
    handleDrawEnd(toPx(e))
  }

  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    if (!t) return
    handleDrawStart(toPx(t))
  }

  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const t = e.touches[0]
    if (!t) return
    handleDrawMove(toPx(t))
  }

  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0]
    if (!t) return
    handleDrawEnd(toPx(t))
  }

  function confirmPolygon() {
    if (polygonPx.length < 3) return
    const points = polygonPx.map(pxToNorm)
    setDraft({ mapId: map.id, shape: 'polygon', points })
    setPolygonPx([])
  }

  function resetDraw() {
    setDraft(null); setPolygonPx([]); setDrawing(false)
  }

  // Pixel-space overlay shapes for the SVG
  function drawingRect() {
    const x = Math.min(startPx.x, currentPx.x), y = Math.min(startPx.y, currentPx.y)
    const w = Math.abs(currentPx.x - startPx.x), h = Math.abs(currentPx.y - startPx.y)
    return <rect x={x} y={y} width={w} height={h} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="2" />
  }

  function draftOverlay() {
    if (!draft) return null
    if (draft.shape === 'rect') {
      const { x: nx, y: ny, width: nw, height: nh } = draft
      const x = nx! * containerSize.w, y = ny! * containerSize.h
      const w = nw! * containerSize.w, h = nh! * containerSize.h
      return <rect x={x} y={y} width={w} height={h} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="2" />
    }
    if (draft.shape === 'circle') {
      const cx = draft.cx! * containerSize.w
      const cy = draft.cy! * containerSize.h
      // r is normalized to width; rx = r*w, ry = r*w for a true circle pixel-wise
      const rx = draft.r! * containerSize.w
      const ry = draft.r! * containerSize.w
      return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="2" />
    }
    if (draft.shape === 'polygon') {
      const pts = draft.points!.map(p => normToPx(p))
      const pointsStr = pts.map(p => `${p.x},${p.y}`).join(' ')
      return (
        <>
          <polygon points={pointsStr} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="2" />
          {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#f59e0b" />)}
        </>
      )
    }
    return null
  }

  function polygonInProgress() {
    if (polygonPx.length === 0) return null
    const pointsStr = polygonPx.map(p => `${p.x},${p.y}`).join(' ')
    return (
      <>
        {polygonPx.length > 1 && <polyline points={pointsStr} fill="none" stroke="#f59e0b" strokeWidth="2" />}
        {polygonPx.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={5} fill="#f59e0b" />)}
      </>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-700 flex-wrap gap-2">
        <span className="font-medium text-stone-200">Set Viewport — {map.name}</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-stone-800 rounded-lg p-1">
            {(['rect', 'circle', 'polygon'] as DrawMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setDrawMode(m); resetDraw() }}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  drawMode === m ? 'bg-amber-700 text-white' : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {m === 'rect' ? 'Rectangle' : m === 'circle' ? 'Circle' : 'Polygon'}
              </button>
            ))}
          </div>
          <button onClick={resetDraw} className="text-xs text-stone-500 hover:text-stone-300 px-2 py-1 border border-stone-700 rounded">Reset</button>
          <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 px-2 py-1 border border-stone-700 rounded">Cancel</button>
        </div>
      </div>

      <div className="px-4 py-1.5 bg-stone-950 border-b border-stone-800">
        <p className="text-xs text-stone-500">
          {drawMode === 'rect' && 'Click and drag to draw a rectangle.'}
          {drawMode === 'circle' && 'Click the center point, then drag to set radius.'}
          {drawMode === 'polygon' && `Click to place points (${polygonPx.length} placed). Press "Confirm Polygon" when done (min 3 points).`}
        </p>
      </div>

      {/* Map canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-stone-950">
        <div
          ref={containerRef}
          className="relative select-none inline-block"
          style={{ cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={map.imageUrl}
            alt={map.name}
            style={{ display: 'block', maxWidth: '80vw', maxHeight: '65vh', userSelect: 'none' }}
            draggable={false}
            onLoad={e => {
              const img = e.currentTarget
              setContainerSize({ w: img.offsetWidth, h: img.offsetHeight })
            }}
          />
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
            width={containerSize.w}
            height={containerSize.h}
          >
            {drawing && drawMode === 'rect' && drawingRect()}
            {drawing && drawMode === 'circle' && (() => {
              const rPx = Math.sqrt((currentPx.x - startPx.x) ** 2 + (currentPx.y - startPx.y) ** 2)
              return <ellipse cx={startPx.x} cy={startPx.y} rx={rPx} ry={rPx} fill="rgba(251,191,36,0.15)" stroke="#f59e0b" strokeWidth="2" />
            })()}
            {!drawing && draftOverlay()}
            {drawMode === 'polygon' && polygonInProgress()}
          </svg>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-t border-stone-700">
        <div>
          {drawMode === 'polygon' && polygonPx.length >= 3 && (
            <button
              onClick={confirmPolygon}
              className="px-3 py-1.5 rounded bg-stone-700 hover:bg-stone-600 text-sm text-stone-200 transition-colors"
            >
              Confirm Polygon ({polygonPx.length} pts)
            </button>
          )}
        </div>
        <button
          onClick={() => draft && onConfirm(draft)}
          disabled={!draft}
          className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Confirm Viewport
        </button>
      </div>
    </div>
  )
}
