import { RequestBase } from '@/common/RequestBase'
import type { NpcRelationship, InventoryItem, LootItem, CustomCurrencyEntry, MapType, MapViewport, QuestStatus } from '@/types'

export class AddNpcRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly faction: string | null = null,
    public readonly lastLocation: string | null = null,
    public readonly notes: string | null = null,
    public readonly relationships: NpcRelationship[] = [],
  ) { super() }
}

export class EditNpcRequest extends RequestBase {
  constructor(
    public readonly npcId: string,
    public readonly name: string,
    public readonly faction: string | null = null,
    public readonly lastLocation: string | null = null,
    public readonly notes: string | null = null,
    public readonly relationships: NpcRelationship[] = [],
  ) { super() }
}

export class DeleteNpcRequest extends RequestBase {
  constructor(public readonly npcId: string) { super() }
}

export class GetNpcsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class AddLocationRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
  ) { super() }
}

export class UpdateLocationRequest extends RequestBase {
  constructor(
    public readonly locationId: string,
    public readonly visited: boolean,
    public readonly notes: string | null = null,
  ) { super() }
}

export class DeleteLocationRequest extends RequestBase {
  constructor(public readonly locationId: string) { super() }
}

export class GetLocationsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class AddSessionNoteRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly note: string,
  ) { super() }
}

export class DeleteSessionNoteRequest extends RequestBase {
  constructor(public readonly noteId: string) { super() }
}

export class GetSessionNotesRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly limit: number = 50,
  ) { super() }
}

export class UpdateInventoryRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly gold: number,
    public readonly silver: number,
    public readonly copper: number,
    public readonly customCurrency: CustomCurrencyEntry[],
    public readonly sharedItems: InventoryItem[],
  ) { super() }
}

export class GetInventoryRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class UpdateCharacterLootRequest extends RequestBase {
  constructor(
    public readonly characterId: string,
    public readonly loot: LootItem[],
  ) { super() }
}

export class AddCustomTableRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly entries: string[],
  ) { super() }
}

export class EditCustomTableRequest extends RequestBase {
  constructor(
    public readonly tableId: string,
    public readonly name: string,
    public readonly entries: string[],
  ) { super() }
}

export class DeleteCustomTableRequest extends RequestBase {
  constructor(public readonly tableId: string) { super() }
}

export class GetCustomTablesRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class AddMapRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly type: MapType,
    public readonly storagePath: string,
    public readonly imageUrl: string,
  ) { super() }
}

export class GetMapsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class DeleteMapRequest extends RequestBase {
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

export class AddBattleMapRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly name: string,
    public readonly type: MapType,
    public readonly storagePath: string,
    public readonly imageUrl: string,
  ) { super() }
}

export class GetBattleMapsRequest extends RequestBase {
  constructor(public readonly campaignId: string) { super() }
}

export class DeleteBattleMapRequest extends RequestBase {
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

export class AddQuestRequest extends RequestBase {
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

export class EditQuestRequest extends RequestBase {
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

export class DeleteQuestRequest extends RequestBase {
  constructor(public readonly questId: string) { super() }
}

export class GetQuestsRequest extends RequestBase {
  constructor(
    public readonly campaignId: string,
    public readonly publicOnly: boolean = false,
  ) { super() }
}
