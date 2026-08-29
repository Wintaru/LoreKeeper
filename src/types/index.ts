export interface SpellSlot {
  level: number
  total: number
  used: number
  // Warlock Pact Magic slots live in the same array but are a separate pool:
  // they are not part of the shared multiclass slot table and they recharge on
  // a short rest. Absent (undefined) means an ordinary Spellcasting slot, which
  // keeps every row written before multiclassing existed valid as-is.
  kind?: 'spell' | 'pact'
}

// One class a character has levels in. `subclass` is optional and only matters
// mechanically for Eldritch Knight / Arcane Trickster, which are third casters.
export interface ClassLevel {
  name: string
  level: number
  subclass: string | null
}

export interface Condition {
  name: string
  roundsRemaining: number | null  // null = indefinite
}

export interface NpcRelationship {
  characterId: string
  relationship: string
}

export interface Npc {
  id: string
  campaignId: string
  name: string
  faction: string | null
  lastLocation: string | null
  notes: string | null
  relationships: NpcRelationship[]
  imageUrl: string | null
  imageStoragePath: string | null
  createdAt: Date
}

export interface Location {
  id: string
  campaignId: string
  name: string
  visited: boolean
  notes: string | null
  imageUrl: string | null
  imageStoragePath: string | null
  createdAt: Date
}

export interface CustomCurrencyEntry {
  name: string
  amount: number
}

export interface InventoryItem {
  name: string
  quantity: number
  notes: string | null
}

export interface LootItem {
  name: string
  quantity: number
  notes: string | null
}

export interface SessionNote {
  id: string
  campaignId: string
  note: string
  createdAt: Date
}

export interface Campaign {
  id: string
  code: string
  gold: number
  silver: number
  copper: number
  customCurrency: CustomCurrencyEntry[]
  sharedItems: InventoryItem[]
  mapAccessGranted: boolean
  sharedMapIds: string[]
  mapViewport: MapViewport | null
  battleMapAccessGranted: boolean
  sharedBattleMapIds: string[]
  battleMapViewport: MapViewport | null
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
}

export type MapType = 'town' | 'city' | 'world' | 'dungeon'

export interface CampaignMap {
  id: string
  campaignId: string
  name: string
  type: MapType
  storagePath: string
  imageUrl: string
  createdAt: Date
}

export interface BattleMap {
  id: string
  campaignId: string
  name: string
  type: MapType
  storagePath: string
  imageUrl: string
  createdAt: Date
}

export interface MapViewportPoint {
  x: number
  y: number
}

export interface MapViewport {
  mapId: string
  shape: 'rect' | 'circle' | 'polygon'
  // rect: top-left corner + size (all 0–1 normalized)
  x?: number
  y?: number
  width?: number
  height?: number
  // circle: center + radius (0–1 normalized)
  cx?: number
  cy?: number
  r?: number
  // polygon: ordered point list (0–1 normalized)
  points?: MapViewportPoint[]
}

export type FateEventType = 'attack' | 'curse' | 'windfall' | 'betrayal' | 'mystery'

export interface FateEvent {
  id: string
  campaignId: string
  eventType: FateEventType
  targetCharacterId: string
  revealedAt: Date | null
  dmNote: string | null
  createdAt: Date
}

export interface FatePoolEntry {
  characterId: string
  weight: number
}

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface CharacterDetails {
  race?: string
  background?: string
  abilityScores?: AbilityScores
  speed?: number
  passivePerception?: number
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
  backstory?: string
}

export interface DeathSaves {
  successes: number
  failures: number
}

export interface InitiativeEntry {
  characterId: string
  initiative: number
  name: string
}

export interface CombatSession {
  id: string
  campaignId: string
  initiativeOrder: InitiativeEntry[]
  currentTurnIndex: number
  roundNumber: number
  isActive: boolean
  createdAt: Date
}

export interface Character {
  id: string
  campaignId: string
  playerName: string
  characterName: string
  // DESIGN FORK — `class` and `level` are KEPT as derived convenience fields
  // rather than being replaced by `classes`.
  //
  //   class  = the primary class (the first entry of `classes`, i.e. the class
  //            the character started in)
  //   level  = TOTAL character level (the sum of every entry's level)
  //   classes = the authoritative per-class breakdown
  //
  // Keeping them was chosen over a clean replacement because:
  //   1. `RosterSummary` is a deliberately narrow SELECT of `class, level` that
  //      backs player-facing surfaces; widening it to parse JSON would give the
  //      un-trusted roster projection more than it needs.
  //   2. The campaign packet export/import format, the XP engine, the fighting
  //      style analyser and the battle-map token code all read these as scalars.
  //   3. Total level stays a real int column, so it remains sortable/filterable
  //      in Postgres.
  // The cost is that they must be recomputed together with `classes` on every
  // write — which is exactly why all class writes funnel through a single
  // Manager operation instead of being set field-by-field.
  class: string
  classes: ClassLevel[]
  race: string | null
  background: string | null
  level: number
  xp: number
  maxHp: number
  currentHp: number
  armorClass: number
  speed: number | null
  passivePerception: number | null
  abilityScores: AbilityScores | null
  personalityTraits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null
  backstory: string | null
  deathSaves: DeathSaves
  spellSlots: SpellSlot[]
  conditions: Condition[]
  loot: LootItem[]
  gold: number
  silver: number
  copper: number
  customCurrency: CustomCurrencyEntry[]
  pushSubscription: PushSubscriptionJSON | null
  isActive: boolean
  tokenImageUrl: string | null
  tokenStoragePath: string | null
  tokenColor: string
  // Player self-service opt-in — lets other party members see this
  // character's wallet/loot in the Roster tab. Defaults to false (private).
  shareInventoryWithParty: boolean
  createdAt: Date
}

// Lean, non-sensitive projection of Character for surfaces that don't need
// (and shouldn't receive) backstory/pushSubscription — the player-facing
// roster and the pre-join "is this you?" picker.
export interface RosterSummary {
  id: string
  characterName: string
  playerName: string
  class: string
  // Per-class breakdown so the roster can show "Fighter 5 / Wizard 3". No more
  // sensitive than the `class` and `level` already in this projection.
  classes: ClassLevel[]
  level: number
  currentHp: number
  maxHp: number
  shareInventoryWithParty: boolean
  // Only populated when shareInventoryWithParty is true — the character
  // themselves opted into other party members seeing this.
  gold?: number
  silver?: number
  copper?: number
  customCurrency?: CustomCurrencyEntry[]
  loot?: LootItem[]
}

export interface Whisper {
  id: string
  characterId: string
  message: string
  createdAt: Date
}

export interface InitiativeRequest {
  id: string
  campaignId: string
  status: 'pending' | 'resolved'
  rolls: Record<string, number>
  createdAt: Date
}

export interface CustomTable {
  id: string
  campaignId: string
  name: string
  entries: string[]
  createdAt: Date
}

export type DamageType =
  | 'acid' | 'bludgeoning' | 'cold' | 'fire' | 'force'
  | 'lightning' | 'necrotic' | 'piercing' | 'poison'
  | 'psychic' | 'radiant' | 'slashing' | 'thunder'

export type ConditionImmunityType =
  | 'blinded' | 'charmed' | 'deafened' | 'exhaustion'
  | 'frightened' | 'grappled' | 'incapacitated' | 'invisible'
  | 'paralyzed' | 'petrified' | 'poisoned' | 'prone'
  | 'restrained' | 'stunned' | 'unconscious'

export interface MonsterAbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface Monster {
  name: string
  cr: string
  hp: number
  ac: number
  speed: string
  abilityScores: MonsterAbilityScores
  skills: string
  damageImmunities: DamageType[]
  conditionImmunities: ConditionImmunityType[]
  senses: string
  legendaryActions: boolean
  lairActions: boolean
  legendaryResistance: boolean
}

export interface MonsterGroup {
  id: string
  monster: Monster
  count: number
}

export interface EncounterBreakdown {
  xpScore: number
  acPenalty: number
  immunityBonus: number
  hpPenalty: number
  specialBonus: number
  adjustedXP: number
  partyDeadlyThreshold: number
}

export interface EncounterDifficulty {
  score: number
  label: string
  colorClass: string
  breakdown: EncounterBreakdown
}

export type QuestStatus = 'draft' | 'active' | 'completed'

export interface Quest {
  id: string
  campaignId: string
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
  status: QuestStatus
  createdAt: Date
}

// ── Battle Map: tokens, fog of war, scale, annotations ─────────────────────────

export type TokenKind = 'player' | 'npc'

export interface StatusEffect {
  name: string
  rollType: string
  modifier: number
  mode: 'bonus' | 'penalty' | 'advantage' | 'disadvantage'
}

export interface BattleToken {
  id: string
  campaignId: string
  battleMapId: string
  kind: TokenKind
  characterId: string | null
  name: string
  baseName: string
  libraryKey: string | null
  imageUrl: string | null
  storagePath: string | null
  color: string
  x: number
  y: number
  size: number
  visibleToPlayers: boolean
  showRange: boolean
  statusEffects: StatusEffect[]
  createdAt: Date
  updatedAt: Date
}

export interface FogStroke {
  id: string
  tool: 'paint' | 'erase'
  points: { x: number; y: number }[]
  radius: number
}

export interface BattleMapFog {
  battleMapId: string
  strokes: FogStroke[]
  updatedAt: Date
}

export interface BattleMapScale {
  battleMapId: string
  feetPerUnit: number
  updatedAt: Date
}

export type AnnotationKind = 'pencil' | 'text' | 'aoe'
export type AoEShape = 'cone' | 'circle' | 'square' | 'line'

export interface PencilAnnotationData {
  points: { x: number; y: number }[]
  color: string
}

export interface TextAnnotationData {
  x: number
  y: number
  text: string
  color: string
}

export interface AoEAnnotationData {
  shape: AoEShape
  originX: number
  originY: number
  targetX: number
  targetY: number
  color: string
}

export interface BattleMapAnnotation {
  id: string
  battleMapId: string
  kind: AnnotationKind
  data: PencilAnnotationData | TextAnnotationData | AoEAnnotationData
  createdAt: Date
}

export interface BattleTokenLibraryEntry {
  id: string
  campaignId: string
  name: string
  baseName: string
  imageUrl: string
  storagePath: string
  color: string
  createdAt: Date
}
