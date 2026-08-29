// The "Campaign Packet" format: a Markdown document (or a .docx that converts
// to the same shape) describing a full campaign to import, or produced when
// exporting one. See parser.ts for the parsing rules.

export interface PacketNpc {
  name: string
  faction: string | null
  lastLocation: string | null
  notes: string | null
  image: string | null
}

export interface PacketLocation {
  name: string
  visited: boolean
  notes: string | null
  image: string | null
}

export interface PacketQuest {
  title: string
  description: string | null
  giver: string | null
  objective: string | null
  location: string | null
  complications: string | null
  reward: string | null
  difficulty: number
  questType: string | null
  isOptional: boolean
  isPublic: boolean
}

export interface PacketAbilityScores {
  str: number | null
  dex: number | null
  con: number | null
  int: number | null
  wis: number | null
  cha: number | null
}

export interface PacketCharacter {
  characterName: string
  playerName: string
  characterClass: string
  level: number
  race: string | null
  background: string | null
  maxHp: number
  armorClass: number
  speed: number | null
  abilityScores: PacketAbilityScores | null
  personalityTraits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  portrait: string | null
  tokenColor: string | null
}

export interface PacketMap {
  name: string
  type: 'town' | 'city' | 'world' | 'dungeon'
  image: string | null
}

export interface CampaignPacket {
  campaignName: string | null
  dmPin: string | null
  npcs: PacketNpc[]
  locations: PacketLocation[]
  quests: PacketQuest[]
  characters: PacketCharacter[]
  maps: PacketMap[]
  battleMaps: PacketMap[]
  warnings: string[]
}
