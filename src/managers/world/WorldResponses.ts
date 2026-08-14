import { ResponseBase } from '@/common/ResponseBase'
import type { Npc, Location, SessionNote, InventoryItem, CustomTable, CustomCurrencyEntry, CampaignMap, BattleMap, Quest } from '@/types'

export class NpcResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly npc: Npc | null

  constructor(correlationId: string, npc: Npc | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.npc = npc
    this.success = npc !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetNpcsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly npcs: Npc[]

  constructor(correlationId: string, npcs: Npc[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.npcs = npcs
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class DeleteResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null

  constructor(correlationId: string, success: boolean, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.success = success
    this.errorMessage = errorMessage ?? null
  }
}

export class LocationResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly location: Location | null

  constructor(correlationId: string, location: Location | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.location = location
    this.success = location !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetLocationsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly locations: Location[]

  constructor(correlationId: string, locations: Location[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.locations = locations
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class SessionNoteResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly note: SessionNote | null

  constructor(correlationId: string, note: SessionNote | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.note = note
    this.success = note !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetSessionNotesResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly notes: SessionNote[]

  constructor(correlationId: string, notes: SessionNote[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.notes = notes
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class GetInventoryResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly gold: number
  readonly silver: number
  readonly copper: number
  readonly customCurrency: CustomCurrencyEntry[]
  readonly sharedItems: InventoryItem[]

  constructor(
    correlationId: string,
    gold: number,
    silver: number,
    copper: number,
    customCurrency: CustomCurrencyEntry[],
    sharedItems: InventoryItem[],
    errorMessage?: string,
  ) {
    super()
    this.correlationId = correlationId
    this.gold = gold
    this.silver = silver
    this.copper = copper
    this.customCurrency = customCurrency
    this.sharedItems = sharedItems
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class CustomTableResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly table: CustomTable | null

  constructor(correlationId: string, table: CustomTable | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.table = table
    this.success = table !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetCustomTablesResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly tables: CustomTable[]

  constructor(correlationId: string, tables: CustomTable[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.tables = tables
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class MapResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly map: CampaignMap | null

  constructor(correlationId: string, map: CampaignMap | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.map = map
    this.success = map !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetMapsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly maps: CampaignMap[]

  constructor(correlationId: string, maps: CampaignMap[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.maps = maps
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class BattleMapResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly map: BattleMap | null

  constructor(correlationId: string, map: BattleMap | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.map = map
    this.success = map !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetBattleMapsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly maps: BattleMap[]

  constructor(correlationId: string, maps: BattleMap[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.maps = maps
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}

export class QuestResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly quest: Quest | null

  constructor(correlationId: string, quest: Quest | null, errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.quest = quest
    this.success = quest !== null
    this.errorMessage = errorMessage ?? null
  }
}

export class GetQuestsResponse extends ResponseBase {
  readonly correlationId: string
  readonly success: boolean
  readonly errorMessage: string | null
  readonly quests: Quest[]

  constructor(correlationId: string, quests: Quest[], errorMessage?: string) {
    super()
    this.correlationId = correlationId
    this.quests = quests
    this.success = errorMessage === undefined
    this.errorMessage = errorMessage ?? null
  }
}
