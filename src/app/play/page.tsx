'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AbilityScores, Character, Campaign } from '@/types'

const D_AND_D_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Blood Hunter', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
]

const D_AND_D_RACES = [
  'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling',
  'Human', 'Tiefling',
]

const D_AND_D_BACKGROUNDS = [
  'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero',
  'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin',
]

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

// ── OCR text parser ───────────────────────────────────────────────────────────

type ParsedSheet = {
  characterName?: string
  class?: string
  race?: string
  background?: string
  level?: number
  maxHp?: number
  currentHp?: number
  armorClass?: number
  speed?: number
  passivePerception?: number
  abilityScores?: Partial<Record<keyof AbilityScores, number>>
}

function parseCharacterText(raw: string): ParsedSheet {
  const fields: ParsedSheet = {}
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const lower = raw.toLowerCase()

  // ── Class + Level together ────────────────────────────────────────────────
  // Handles "Druid 18", "Fighter 5 (Champion)", "Rogue 3/Fighter 2" etc.
  const classLevelRe = new RegExp(
    `\\b(artificer|barbarian|bard|blood\\s+hunter|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)\\s+(\\d{1,2})\\b`,
    'i'
  )
  const classLevelMatch = lower.match(classLevelRe)
  if (classLevelMatch) {
    const cls = classLevelMatch[1].replace(/\s+/g, ' ')
    fields.class = cls.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    const lvl = parseInt(classLevelMatch[2])
    if (lvl >= 1 && lvl <= 20) fields.level = lvl
  } else {
    // Class without adjacent level number
    for (const cls of D_AND_D_CLASSES.map(c => c.toLowerCase())) {
      if (lower.includes(cls)) {
        fields.class = cls.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        break
      }
    }
    // Level separately: "Level: 5", "5th level", or label → value on next line
    const lvlInline = lower.match(/(?:character\s+)?level[:\s]+(\d{1,2})|(\d{1,2})(?:st|nd|rd|th)\s+level/)
    if (lvlInline) {
      const lvl = parseInt(lvlInline[1] ?? lvlInline[2])
      if (lvl >= 1 && lvl <= 20) fields.level = lvl
    }
  }

  // ── Race ─────────────────────────────────────────────────────────────────
  for (const r of D_AND_D_RACES.map(r => r.toLowerCase())) {
    if (lower.includes(r)) {
      fields.race = r.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      break
    }
  }

  // ── Background ───────────────────────────────────────────────────────────
  for (const bg of D_AND_D_BACKGROUNDS.map(b => b.toLowerCase())) {
    if (lower.includes(bg)) {
      fields.background = bg.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      break
    }
  }

  // ── Character name ────────────────────────────────────────────────────────
  // Try explicit label first ("Character Name: Aragorn")
  const nameLabel = raw.match(/character\s+name[:\s]+([^\n]+)/i)
  if (nameLabel) {
    fields.characterName = nameLabel[1].trim()
  } else {
    // Fall back: prominent standalone word/phrase near the top of the doc
    // (all-caps or title-case, no common label words, 2-30 chars)
    const SKIP = ['fast', 'character', 'sheet', 'player', 'campaign', 'class', 'level', 'race', 'background']
    for (const line of lines.slice(0, 10)) {
      if (line.length < 2 || line.length > 32) continue
      if (!/^[A-Za-z]/.test(line)) continue
      if (SKIP.some(s => line.toLowerCase().includes(s))) continue
      if (/^[A-Z][a-zA-Z'\- ]{1,31}$/.test(line)) {
        fields.characterName = line.trim()
        break
      }
    }
  }

  // ── Max HP ────────────────────────────────────────────────────────────────
  // "Hit Points: 165", "HIT POINTS\n165", "Max HP: 45"
  // \s matches \n in JS so these patterns cross line boundaries
  const hpInline =
    lower.match(/(?:hit\s+points?\s*(?:maximum|max)?|max(?:imum)?\s*h\.?p\.?)\s*[:\s]\s*(\d+)/) ??
    lower.match(/h\.?p\.?\s*max\s*[:\s]\s*(\d+)/)
  if (hpInline) {
    fields.maxHp = parseInt(hpInline[1])
  } else {
    // Line-by-line: find "HIT POINTS" label, next number is the value
    const hpIdx = lines.findIndex(l => /^hit\s+points?/i.test(l))
    if (hpIdx >= 0) {
      for (let j = hpIdx + 1; j < Math.min(hpIdx + 4, lines.length); j++) {
        const n = parseInt(lines[j])
        if (!isNaN(n) && n > 0 && n < 1000 && /^\d+$/.test(lines[j])) { fields.maxHp = n; break }
      }
    }
    // Last resort: X/Y (current/max)
    if (!fields.maxHp) {
      const slash = raw.match(/(\d+)\s*\/\s*(\d+)/)
      if (slash) {
        const a = parseInt(slash[1]), b = parseInt(slash[2])
        fields.maxHp = Math.max(a, b)
        fields.currentHp = Math.min(a, b)
      }
    }
  }

  // ── Armor class ───────────────────────────────────────────────────────────
  // Inline: "Armor Class: 15", "AC: 15"
  const acInline = lower.match(/(?:armor\s+class|a\.c\.?)\s*[:\s()\w]{0,10}?(\d{1,2})(?!\d)/)
  if (acInline) {
    fields.armorClass = parseInt(acInline[1])
  } else {
    // Line-by-line: "ARMOR CLASS" label → first reasonable number nearby
    const acIdx = lines.findIndex(l => /armor\s+class/i.test(l))
    if (acIdx >= 0) {
      for (let j = acIdx; j < Math.min(acIdx + 4, lines.length); j++) {
        const nums = lines[j].match(/\b(\d{1,2})\b/g)
        if (nums) {
          const n = parseInt(nums[0])
          if (n >= 5 && n <= 30) { fields.armorClass = n; break }
        }
      }
    }
  }

  // ── Speed ─────────────────────────────────────────────────────────────────
  // "Speed: 30", "30 ft.", "30ft"
  const speedMatch =
    lower.match(/speed\s*[:\s]\s*(\d+)/) ??
    raw.match(/\b(\d+)\s*ft\.?/i)
  if (speedMatch) {
    const spd = parseInt(speedMatch[1])
    if (spd > 0 && spd <= 120) fields.speed = spd
  }

  // ── Passive perception ────────────────────────────────────────────────────
  // "Passive Wisdom (Perception): 15"  OR  "15\nPASSIVE WISDOM (PERCEPTION)"
  const ppForward = lower.match(/passive\s+(?:wisdom\s+)?(?:\()?perception(?:\))?\s*[:\s]\s*(\d+)/)
  if (ppForward) {
    fields.passivePerception = parseInt(ppForward[1])
  } else {
    const ppReverse = raw.match(/(\d{1,2})\s*\n?\s*PASSIVE\s+(?:WISDOM\s+)?\(?PERCEPTION\)?/i)
    if (ppReverse) fields.passivePerception = parseInt(ppReverse[1])
  }

  // ── Ability scores ────────────────────────────────────────────────────────
  // Strategy A — inline: "Strength: 14", "STR: 8"
  // Strategy B — multiline: line STARTS with ability name/abbrev (may have trailing text),
  //              then scan next few lines for a standalone score (skip +/- modifiers)
  const scores: Partial<Record<keyof AbilityScores, number>> = {}
  const ABILITY_START: { re: RegExp; key: keyof AbilityScores }[] = [
    { re: /^str(?:ength)?/i,      key: 'str' },
    { re: /^dex(?:terity)?/i,     key: 'dex' },
    { re: /^con(?:stitution)?/i,  key: 'con' },
    { re: /^int(?:elligence)?/i,  key: 'int' },
    { re: /^wis(?:dom)?/i,        key: 'wis' },
    { re: /^cha(?:risma)?/i,      key: 'cha' },
  ]

  // Strategy A
  const inlineAbbrevs: [string, keyof AbilityScores][] = [
    ['strength', 'str'], ['str', 'str'],
    ['dexterity', 'dex'], ['dex', 'dex'],
    ['constitution', 'con'], ['con', 'con'],
    ['intelligence', 'int'], ['int', 'int'],
    ['wisdom', 'wis'], ['wis', 'wis'],
    ['charisma', 'cha'], ['cha', 'cha'],
  ]
  for (const [name, key] of inlineAbbrevs) {
    if (scores[key]) continue
    const m = lower.match(new RegExp(`\\b${name}\\b\\s*[:\\s]\\s*(-?\\d{1,2})(?!\\d)`))
    if (m) {
      const v = parseInt(m[1])
      if (v <= 30) scores[key] = v
    }
  }

  // Strategy B — multiline with modifier skip
  for (let i = 0; i < lines.length - 1; i++) {
    for (const { re, key } of ABILITY_START) {
      if (scores[key]) continue
      if (!re.test(lines[i])) continue
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const t = lines[j].trim()
        if (/^[+\-]\d/.test(t)) continue           // skip modifier line (+2, -1…)
        if (/^[A-Za-z]/.test(t)) break             // hit next section label — stop
        const v = parseInt(t)
        if (!isNaN(v) && v <= 30 && /^-?\d{1,2}$/.test(t)) {
          scores[key] = v; break
        }
      }
    }
  }

  if (Object.keys(scores).length > 0) fields.abilityScores = scores

  return fields
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerJoinPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<'code' | 'rejoin' | 'character'>('code')
  const [campaignCode, setCampaignCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([])

  // Required
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('')
  const [level, setLevel] = useState(1)
  const [maxHp, setMaxHp] = useState(10)
  const [armorClass, setArmorClass] = useState(10)

  // Optional details
  const [race, setRace] = useState('')
  const [background, setBackground] = useState('')
  const [speed, setSpeed] = useState('')
  const [passivePerception, setPassivePerception] = useState('')
  const [abilityScores, setAbilityScores] = useState<Partial<Record<keyof AbilityScores, string>>>({})

  // UI state
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanRegion, setScanRegion] = useState(0)   // 0 = not scanning
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (campaignCode.trim().length < 3) { setError('Enter a valid campaign code'); return }
    if (!playerName.trim()) { setError('Enter your name'); return }
    setError(null)
    setLookingUp(true)
    try {
      const code = campaignCode.trim().toUpperCase()
      const supabase = createClient()
      const { data: campaign } = await supabase.from('campaigns').select('id').eq('code', code).single()
      if (!campaign) { setError('Campaign not found'); return }
      const res = await fetch(`/api/campaigns/roster?campaignId=${campaign.id as string}`)
      const data: unknown = await res.json()
      const characters = isRosterResponse(data) ? data.characters : []
      if (characters.length > 0) {
        setExistingCharacters(characters)
        setStep('rejoin')
      } else {
        setStep('character')
      }
    } catch {
      setError('Something went wrong — try again')
    } finally {
      setLookingUp(false)
    }
  }

  function handleRejoinSelect(character: Character) {
    localStorage.setItem(`character_${campaignCode.trim().toUpperCase()}`, character.id)
    router.push(`/play/campaign/${campaignCode.trim().toUpperCase()}`)
  }

  function applyParsed(parsed: ParsedSheet) {
    let detailsFound = false

    if (parsed.characterName) setCharacterName(parsed.characterName)
    if (parsed.class && D_AND_D_CLASSES.includes(parsed.class)) setCharacterClass(parsed.class)
    if (typeof parsed.level === 'number') setLevel(Math.min(20, Math.max(1, parsed.level)))
    if (typeof parsed.maxHp === 'number' && parsed.maxHp > 0) setMaxHp(parsed.maxHp)
    if (typeof parsed.armorClass === 'number' && parsed.armorClass > 0) setArmorClass(parsed.armorClass)

    if (parsed.race) setRace(parsed.race)
    if (parsed.background) { setBackground(parsed.background); detailsFound = true }
    if (typeof parsed.speed === 'number') { setSpeed(String(parsed.speed)); detailsFound = true }
    if (typeof parsed.passivePerception === 'number') { setPassivePerception(String(parsed.passivePerception)); detailsFound = true }
    if (parsed.abilityScores && Object.keys(parsed.abilityScores).length > 0) {
      setAbilityScores(
        Object.fromEntries(
          Object.entries(parsed.abilityScores).map(([k, v]) => [k, String(v)])
        )
      )
    }

    if (detailsFound) setShowDetails(true)
  }

  async function handleScan(file: File) {
    setScanning(true)
    setScanRegion(0)
    setScanMessage(null)
    const COLS = 2, ROWS = 3
    try {
      const { createWorker } = await import('tesseract.js')
      const imageUrl = URL.createObjectURL(file)
      const img = await loadImage(imageUrl)
      const worker = await createWorker('eng')
      let combinedText = ''
      try {
        let n = 0
        for (let row = 0; row < ROWS; row++) {
          for (let col = 0; col < COLS; col++) {
            n++
            setScanRegion(n)
            const blob = await cropToBlob(img, {
              x: Math.floor(col * img.width / COLS),
              y: Math.floor(row * img.height / ROWS),
              w: Math.ceil(img.width / COLS),
              h: Math.ceil(img.height / ROWS),
            })
            const { data: { text } } = await worker.recognize(blob)
            combinedText += '\n' + text
          }
        }
      } finally {
        await worker.terminate()
        URL.revokeObjectURL(imageUrl)
      }
      const parsed = parseCharacterText(combinedText)
      const filledCount = Object.values(parsed).filter(v => v !== undefined).length
      if (filledCount === 0) {
        setScanMessage({ type: 'error', text: 'Couldn\'t read the sheet — try a clearer photo or fill in manually' })
      } else {
        applyParsed(parsed)
        setScanMessage({ type: 'success', text: `Scanned ${filledCount} field${filledCount !== 1 ? 's' : ''} — review and adjust anything that looks off` })
      }
    } catch {
      setScanMessage({ type: 'error', text: 'Scan failed — fill in manually' })
    } finally {
      setScanning(false)
      setScanRegion(0)
    }
  }

  const TOTAL_REGIONS = 6

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const parsedAbilityScores = buildAbilityScores(abilityScores)
    try {
      const res = await fetch('/api/campaigns/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignCode: campaignCode.trim().toUpperCase(),
          playerName,
          characterName,
          characterClass,
          level,
          maxHp,
          armorClass,
          race: race.trim() || undefined,
          background: background.trim() || undefined,
          abilityScores: parsedAbilityScores ?? undefined,
          speed: speed.trim() ? parseInt(speed, 10) || undefined : undefined,
          passivePerception: passivePerception.trim() ? parseInt(passivePerception, 10) || undefined : undefined,
        }),
      })
      const data: unknown = await res.json()
      if (!res.ok || !isJoinResponse(data)) {
        setError(isErrorResponse(data) ? data.error : 'Failed to join campaign')
        return
      }
      localStorage.setItem(`character_${data.campaign.code}`, data.character.id)
      router.push(`/play/campaign/${data.campaign.code}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LoreKeeper</h1>
          <p className="text-stone-400 mt-1">
            {step === 'code' ? 'Enter your campaign code' : step === 'rejoin' ? 'Is this you?' : 'Create your character'}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={e => void handleCodeSubmit(e)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Campaign Code</label>
              <input
                type="text"
                value={campaignCode}
                onChange={e => setCampaignCode(e.target.value.toUpperCase())}
                placeholder="e.g. WOLF-KEEP-42"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 font-mono placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-1">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Player name"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={lookingUp} className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
              {lookingUp ? 'Looking up campaign…' : 'Continue'}
            </button>
          </form>
        ) : step === 'rejoin' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              {existingCharacters.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleRejoinSelect(c)}
                  className="w-full text-left bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 transition-colors"
                >
                  <p className="font-semibold text-stone-100">{c.characterName}</p>
                  <p className="text-sm text-stone-400">{c.playerName} · {c.class} {c.level}</p>
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('code')}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep('character')}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                None of these — new character
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">

            {/* Scan */}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) void handleScan(f) }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-60 border border-stone-700 text-stone-300 text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
            >
              {scanning ? (
                <>
                  <span className="animate-spin inline-block">⟳</span>
                  {scanRegion > 0 ? `Scanning section ${scanRegion}/${TOTAL_REGIONS}…` : 'Preparing…'}
                </>
              ) : (
                <><span>📷</span> Scan Character Sheet</>
              )}
            </button>
            <p className="text-xs text-stone-500 -mt-2">
              OCR scanning is experimental — always review and correct the filled fields.
            </p>
            {scanMessage && (
              <p className={`text-sm ${scanMessage.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {scanMessage.text}
              </p>
            )}

            {/* Required */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1">Character Name</label>
                <input
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  placeholder="Your character's name"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Class</label>
                  <select
                    value={characterClass}
                    onChange={e => setCharacterClass(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="">Class…</option>
                    {D_AND_D_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Race</label>
                  <input
                    type="text"
                    list="races-list"
                    value={race}
                    onChange={e => setRace(e.target.value)}
                    placeholder="Human…"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <datalist id="races-list">
                    {D_AND_D_RACES.map(r => <option key={r} value={r} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Level</label>
                  <input type="number" value={level} min={1} max={20}
                    onChange={e => setLevel(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">Max HP</label>
                  <input type="number" value={maxHp} min={1}
                    onChange={e => setMaxHp(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1">AC</label>
                  <input type="number" value={armorClass} min={1}
                    onChange={e => setArmorClass(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 text-center focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Ability Scores</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {ABILITY_KEYS.map(key => (
                    <div key={key}>
                      <p className="text-center text-xs text-stone-500 mb-1">{ABILITY_LABELS[key]}</p>
                      <input
                        type="number"
                        max={30}
                        placeholder="—"
                        value={abilityScores[key] ?? ''}
                        onChange={e => setAbilityScores(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-1 py-1.5 text-sm font-mono text-center focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Collapsible: Other Details */}
            <div className="border border-stone-800 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDetails(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-400 hover:text-stone-200 transition-colors"
              >
                <span>Other Details <span className="text-stone-600 font-normal">(optional)</span></span>
                <span className="text-stone-600 text-xs">{showDetails ? '▲' : '▼'}</span>
              </button>
              {showDetails && (
                <div className="px-4 pb-4 space-y-4 border-t border-stone-800">
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-stone-300 mb-1">Background</label>
                    <input
                      type="text"
                      list="backgrounds-list"
                      value={background}
                      onChange={e => setBackground(e.target.value)}
                      placeholder="Soldier, Sage…"
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <datalist id="backgrounds-list">
                      {D_AND_D_BACKGROUNDS.map(b => <option key={b} value={b} />)}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">Speed (ft)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="30"
                        value={speed}
                        onChange={e => setSpeed(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">Passive Perc.</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="10"
                        value={passivePerception}
                        onChange={e => setPassivePerception(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(existingCharacters.length > 0 ? 'rejoin' : 'code')}
                className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Joining…' : 'Join Campaign'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function cropToBlob(
  img: HTMLImageElement,
  region: { x: number; y: number; w: number; h: number },
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = region.w
  canvas.height = region.h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Crop failed'))), 'image/png')
  })
}

function buildAbilityScores(inputs: Partial<Record<keyof AbilityScores, string>>): AbilityScores | null {
  const keys: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
  const parsed: Partial<AbilityScores> = {}
  for (const key of keys) {
    const n = parseInt(inputs[key] ?? '', 10)
    if (!isNaN(n)) parsed[key] = n
  }
  if (Object.keys(parsed).length === 0) return null
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...parsed }
}

function isRosterResponse(value: unknown): value is { characters: Character[] } {
  return typeof value === 'object' && value !== null && 'characters' in value &&
    Array.isArray((value as Record<string, unknown>).characters)
}

function isJoinResponse(value: unknown): value is { character: Character; campaign: Campaign } {
  return typeof value === 'object' && value !== null && 'character' in value && 'campaign' in value
}

function isErrorResponse(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value &&
    typeof (value as Record<string, unknown>).error === 'string'
}
