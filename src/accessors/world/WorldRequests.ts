import { RequestBase } from '@/common/RequestBase'
import type { NpcRelationship, InventoryItem, LootItem, CustomCurrencyEntry, MapType, MapViewport, QuestStatus } from '@/types'

export class StoreNpcRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly faction: string | null = null,
    public readonly lastLocation: string | null = null,
    public readonly notes: string | null = null,
    public readonly relationships: NpcRelationship[] = [],
    public readonly imageUrl: string | null = null,
    public readonly imageStoragePath: string | null = null,
  ) { super() }
}

export class UpdateNpcRequest extends RequestBase {
  constructor(
    public readonly npcId: string,
    public readonly name: string,
    public readonly faction: string | null = null,
    public readonly lastLocation: string | null = null,
    public readonly notes: string | null = null,
    public readonly relationships: NpcRelationship[] = [],
  ) { super() }
}

export class SetNpcImageRequest extends RequestBase {
  constructor(
    public readonly npcId: string,
    public readonly imageUrl: string | null,
    public readonly imageStoragePath: string | null,
  ) { super() }
}

export class LoadNpcsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class RemoveNpcRequest extends RequestBase {
  constructor(public readonly npcId: string) { super() }
}

export class StoreLocationRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly imageUrl: string | null = null,
    public readonly imageStoragePath: string | null = null,
  ) { super() }
}

export class UpdateLocationRequest extends RequestBase {
  constructor(
    public readonly locationId: string,
    public readonly visited: boolean,
    public readonly notes: string | null = null,
  ) { super() }
}

export class SetLocationImageRequest extends RequestBase {
  constructor(
    public readonly locationId: string,
    public readonly imageUrl: string | null,
    public readonly imageStoragePath: string | null,
  ) { super() }
}

export class LoadLocationsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class RemoveLocationRequest extends RequestBase {
  constructor(public readonly locationId: string) { super() }
}

export class StoreSessionNoteRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly note: string,
  ) { super() }
}

export class LoadSessionNotesRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly limit: number = 50,
  ) { super() }
}

export class RemoveSessionNoteRequest extends RequestBase {
  constructor(public readonly noteId: string) { super() }
}

export class UpdateCampaignInventoryRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly gold: number,
    public readonly silver: number,
    public readonly copper: number,
    public readonly customCurrency: CustomCurrencyEntry[],
    public readonly sharedItems: InventoryItem[],
  ) { super() }
}

export class LoadCampaignInventoryRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class UpdateCharacterLootRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly loot: LootItem[],
  ) { super() }
}

export class StoreCustomTableRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly entries: string[],
  ) { super() }
}

export class UpdateCustomTableRequest extends RequestBase {
  constructor(
    public readonly tableId: string,
    public readonly name: string,
    public readonly entries: string[],
  ) { super() }
}

export class LoadCustomTablesRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class RemoveCustomTableRequest extends RequestBase {
  constructor(public readonly tableId: string) { super() }
}

export class StoreMapRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly type: MapType,
    public readonly storagePath: string,
    public readonly imageUrl: string,
  ) { super() }
}

export class LoadMapsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class RemoveMapRequest extends RequestBase {
  constructor(
    public readonly mapId: string,
    public readonly storagePath: string,
  ) { super() }
}

export class UpdateMapAccessRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly mapAccessGranted: boolean,
    public readonly sharedMapIds: string[],
    public readonly mapViewport: MapViewport | null,
  ) { super() }
}

export class StoreBattleMapRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly type: MapType,
    public readonly storagePath: string,
    public readonly imageUrl: string,
  ) { super() }
}

export class LoadBattleMapsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class RemoveBattleMapRequest extends RequestBase {
  constructor(
    public readonly mapId: string,
    public readonly storagePath: string,
  ) { super() }
}

export class UpdateBattleMapAccessRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly battleMapAccessGranted: boolean,
    public readonly sharedBattleMapIds: string[],
    public readonly battleMapViewport: MapViewport | null,
  ) { super() }
}

export class StoreQuestRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly title: string,
    public readonly description: string | null = null,
    public readonly giver: string | null = null,
    public readonly objective: string | null = null,
    public readonly location: string | null = null,
    public readonly complications: string | null = null,
    public readonly reward: string | null = null,
    public readonly difficulty: number = 1,
    public readonly questType: string | null = null,
    public readonly isOptional: boolean = true,
  ) { super() }
}

export class UpdateQuestRequest extends RequestBase {
  constructor(
    public readonly questId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly giver: string | null,
    public readonly objective: string | null,
    public readonly location: string | null,
    public readonly complications: string | null,
    public readonly reward: string | null,
    public readonly difficulty: number,
    public readonly questType: string | null,
    public readonly isOptional: boolean,
    public readonly isPublic: boolean,
    public readonly status: QuestStatus,
  ) { super() }
}

export class LoadQuestsRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly publicOnly: boolean = false,
  ) { super() }
}

export class RemoveQuestRequest extends RequestBase {
  constructor(public readonly questId: string) { super() }
}
