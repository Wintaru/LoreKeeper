import type {
  CampaignPacket, PacketNpc, PacketLocation, PacketQuest, PacketCharacter, PacketMap, PacketAbilityScores,
} from './schema'

type SectionName = 'settings' | 'npcs' | 'locations' | 'quests' | 'characters' | 'maps' | 'battlemaps' | null

const SECTION_ALIASES: Record<string, SectionName> = {
  'settings': 'settings',
  'npcs': 'npcs', 'npc': 'npcs',
  'locations': 'locations', 'location': 'locations',
  'quests': 'quests', 'quest': 'quests',
  'player characters': 'characters', 'characters': 'characters', 'players': 'characters',
  'maps': 'maps', 'map': 'maps',
  'battle maps': 'battlemaps', 'battle map': 'battlemaps', 'battlemaps': 'battlemaps',
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseBool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback
  const v = value.trim().toLowerCase()
  return v === 'yes' || v === 'true' || v === 'y'
}

function parseNum(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const n = parseInt(value.trim(), 10)
  return Number.isFinite(n) ? n : fallback
}

function parseAbilityScores(value: string | undefined): PacketAbilityScores | null {
  if (!value) return null
  const scores: PacketAbilityScores = { str: null, dex: null, con: null, int: null, wis: null, cha: null }
  const re = /(str|dex|con|int|wis|cha)\D*(\d+)/gi
  let m: RegExpExecArray | null
  let found = false
  while ((m = re.exec(value)) !== null) {
    const key = m[1].toLowerCase() as keyof PacketAbilityScores
    scores[key] = parseInt(m[2], 10)
    found = true
  }
  return found ? scores : null
}

function blankNpc(name: string): PacketNpc {
  return { name, faction: null, lastLocation: null, notes: null, image: null }
}
function blankLocation(name: string): PacketLocation {
  return { name, visited: false, notes: null, image: null }
}
function blankQuest(title: string): PacketQuest {
  return { title, description: null, giver: null, objective: null, location: null, complications: null, reward: null, difficulty: 1, questType: null, isOptional: true, isPublic: false }
}
function blankCharacter(name: string): PacketCharacter {
  return {
    characterName: name, playerName: '', characterClass: '', level: 1, race: null, background: null,
    maxHp: 10, armorClass: 10, speed: null, abilityScores: null, personalityTraits: null, ideals: null,
    bonds: null, flaws: null, backstory: null, portrait: null, tokenColor: null,
  }
}
function blankMap(name: string): PacketMap {
  return { name, type: 'dungeon', image: null }
}

const VALID_MAP_TYPES = new Set(['town', 'city', 'world', 'dungeon'])

/**
 * Parses a Campaign Packet (Markdown, or the Markdown produced by converting
 * a .docx via mammoth). Line-based state machine:
 *   # Campaign: <name>   -> campaign name (cosmetic, not stored anywhere)
 *   ## <Section>          -> switches the active section
 *   ### <Entity Name>     -> starts a new entity within the active section
 *   - Key: Value          -> sets a field on the current entity; a value can
 *                            continue on following plain-text lines until the
 *                            next bullet or heading (supports prose fields
 *                            like Notes/Backstory spanning paragraphs).
 */
export function parseCampaignPacket(text: string): CampaignPacket {
  const packet: CampaignPacket = {
    campaignName: null, dmPin: null, npcs: [], locations: [], quests: [], characters: [], maps: [], battleMaps: [], warnings: [],
  }

  let section: SectionName = null
  let currentEntity: PacketNpc | PacketLocation | PacketQuest | PacketCharacter | PacketMap | null = null
  let currentFields: Record<string, string> = {}
  let lastFieldKey: string | null = null

  function finalizeEntity() {
    if (!currentEntity || !section) return
    if (section === 'npcs') {
      const f = currentFields
      const n = currentEntity as PacketNpc
      n.faction = f['faction'] ?? null
      n.lastLocation = f['last location'] ?? f['location'] ?? null
      n.notes = f['notes'] ?? null
      n.image = f['image'] ?? f['portrait'] ?? null
      packet.npcs.push(n)
    } else if (section === 'locations') {
      const f = currentFields
      const l = currentEntity as PacketLocation
      l.visited = parseBool(f['visited'])
      l.notes = f['notes'] ?? null
      l.image = f['image'] ?? null
      packet.locations.push(l)
    } else if (section === 'quests') {
      const f = currentFields
      const q = currentEntity as PacketQuest
      // The DM's quest editor labels this field "Description / Notes", so
      // accept either word as the key on import.
      q.description = f['description'] ?? f['notes'] ?? null
      q.giver = f['giver'] ?? null
      q.objective = f['objective'] ?? null
      q.location = f['location'] ?? null
      q.complications = f['complications'] ?? f['twist'] ?? null
      q.reward = f['reward'] ?? null
      q.difficulty = parseNum(f['difficulty'], 1)
      q.questType = f['type'] ?? f['quest type'] ?? null
      q.isOptional = parseBool(f['optional'], true)
      q.isPublic = parseBool(f['public'], false)
      packet.quests.push(q)
    } else if (section === 'characters') {
      const f = currentFields
      const c = currentEntity as PacketCharacter
      c.playerName = f['player'] ?? f['player name'] ?? ''
      c.characterClass = f['class'] ?? ''
      c.level = parseNum(f['level'], 1)
      c.race = f['race'] ?? null
      c.background = f['background'] ?? null
      c.maxHp = parseNum(f['max hp'] ?? f['hp'], 10)
      c.armorClass = parseNum(f['armor class'] ?? f['ac'], 10)
      c.speed = f['speed'] ? parseNum(f['speed'], 30) : null
      c.abilityScores = parseAbilityScores(f['ability scores'] ?? f['stats'])
      c.personalityTraits = f['personality traits'] ?? null
      c.ideals = f['ideals'] ?? null
      c.bonds = f['bonds'] ?? null
      c.flaws = f['flaws'] ?? null
      c.backstory = f['backstory'] ?? null
      c.portrait = f['portrait'] ?? f['image'] ?? null
      c.tokenColor = f['token color'] ?? f['color'] ?? null
      packet.characters.push(c)
    } else if (section === 'maps' || section === 'battlemaps') {
      const f = currentFields
      const m = currentEntity as PacketMap
      const type = (f['type'] ?? 'dungeon').toLowerCase().trim()
      m.type = (VALID_MAP_TYPES.has(type) ? type : 'dungeon') as PacketMap['type']
      m.image = f['image'] ?? null
      if (section === 'maps') packet.maps.push(m)
      else packet.battleMaps.push(m)
    }
    currentEntity = null
    currentFields = {}
    lastFieldKey = null
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()

    const h1 = /^#\s+(.*)$/.exec(trimmed)
    if (h1) {
      finalizeEntity()
      section = null
      const m = /^campaign:\s*(.*)$/i.exec(h1[1].trim())
      packet.campaignName = m ? m[1].trim() : h1[1].trim()
      continue
    }

    const h2 = /^##\s+(.*)$/.exec(trimmed)
    if (h2) {
      finalizeEntity()
      section = SECTION_ALIASES[normalizeKey(h2[1])] ?? null
      if (!section) packet.warnings.push(`Unrecognized section "${h2[1].trim()}" was skipped.`)
      continue
    }

    const h3 = /^###\s+(.*)$/.exec(trimmed)
    if (h3) {
      finalizeEntity()
      const name = h3[1].trim()
      if (section === 'npcs') currentEntity = blankNpc(name)
      else if (section === 'locations') currentEntity = blankLocation(name)
      else if (section === 'quests') currentEntity = blankQuest(name)
      else if (section === 'characters') currentEntity = blankCharacter(name)
      else if (section === 'maps' || section === 'battlemaps') currentEntity = blankMap(name)
      else { packet.warnings.push(`Entry "${name}" appeared outside any recognized section and was skipped.`); currentEntity = null }
      currentFields = {}
      lastFieldKey = null
      continue
    }

    if (section === 'settings' && !currentEntity) {
      const bullet = /^-\s*([^:]+):\s*(.*)$/.exec(trimmed)
      if (bullet && normalizeKey(bullet[1]) === 'dm pin') packet.dmPin = bullet[2].trim()
      continue
    }

    if (!currentEntity) continue

    const bullet = /^-\s*([^:]+):\s*(.*)$/.exec(trimmed)
    if (bullet) {
      const key = normalizeKey(bullet[1])
      currentFields[key] = bullet[2].trim()
      lastFieldKey = key
      continue
    }

    // Continuation of a multi-line prose value (e.g. Backstory spanning paragraphs)
    if (trimmed && lastFieldKey) {
      currentFields[lastFieldKey] = `${currentFields[lastFieldKey]}\n${trimmed}`.trim()
    }
  }
  finalizeEntity()

  return packet
}
