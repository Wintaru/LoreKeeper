import { createServiceClient } from '@/lib/supabase/server'
import { HandlerResolverBuilder } from '@/common/resolver/HandlerResolverBuilder'

// Accessors — Campaign
import { CampaignAccessor } from '@/accessors/campaign/CampaignAccessor'
import { StoreCampaignHandler } from '@/accessors/campaign/handlers/StoreCampaignHandler'
import { LoadCampaignByCodeHandler } from '@/accessors/campaign/handlers/LoadCampaignByCodeHandler'
import { StoreCampaignRequest, LoadCampaignByCodeRequest } from '@/accessors/campaign/CampaignRequests'

// Accessors — Character
import { CharacterAccessor } from '@/accessors/character/CharacterAccessor'
import { StoreCharacterHandler } from '@/accessors/character/handlers/StoreCharacterHandler'
import { LoadRosterHandler } from '@/accessors/character/handlers/LoadRosterHandler'
import { UpdateCharacterHpHandler } from '@/accessors/character/handlers/UpdateCharacterHpHandler'
import { UpdateConditionsHandler as AccessorUpdateConditionsHandler } from '@/accessors/character/handlers/UpdateConditionsHandler'
import { UpdateDeathSavesHandler as AccessorUpdateDeathSavesHandler } from '@/accessors/character/handlers/UpdateDeathSavesHandler'
import { UpdateSpellSlotsHandler as AccessorUpdateSpellSlotsHandler } from '@/accessors/character/handlers/UpdateSpellSlotsHandler'
import { LoadCharacterHandler } from '@/accessors/character/handlers/LoadCharacterHandler'
import { UpdateXpHandler } from '@/accessors/character/handlers/UpdateXpHandler'
import { KickCharacterHandler } from '@/accessors/character/handlers/KickCharacterHandler'
import { UpdateCharacterCurrencyHandler as AccessorUpdateCharacterCurrencyHandler } from '@/accessors/character/handlers/UpdateCharacterCurrencyHandler'
import { UpdateCharacterStatsHandler as AccessorUpdateCharacterStatsHandler } from '@/accessors/character/handlers/UpdateCharacterStatsHandler'
import { UpdateCharacterTokenHandler as AccessorUpdateCharacterTokenHandler } from '@/accessors/character/handlers/UpdateCharacterTokenHandler'
import {
  StoreCharacterRequest,
  LoadRosterRequest,
  UpdateCharacterHpRequest,
  UpdateCharacterConditionsRequest,
  UpdateDeathSavesRequest as AccessorUpdateDeathSavesRequest,
  UpdateSpellSlotsRequest as AccessorUpdateSpellSlotsRequest,
  LoadCharacterRequest,
  UpdateXpRequest,
  KickCharacterRequest,
  UpdateCharacterCurrencyRequest as AccessorUpdateCharacterCurrencyRequest,
  UpdateCharacterStatsRequest as AccessorUpdateCharacterStatsRequest,
  UpdateCharacterTokenRequest as AccessorUpdateCharacterTokenRequest,
} from '@/accessors/character/CharacterRequests'

// Accessors — Combat
import { CombatAccessor } from '@/accessors/combat/CombatAccessor'
import { StoreCombatSessionHandler } from '@/accessors/combat/handlers/StoreCombatSessionHandler'
import { LoadCombatSessionHandler } from '@/accessors/combat/handlers/LoadCombatSessionHandler'
import { UpdateCombatSessionHandler } from '@/accessors/combat/handlers/UpdateCombatSessionHandler'
import { StoreInitiativeRequestHandler } from '@/accessors/combat/handlers/StoreInitiativeRequestHandler'
import { UpdateInitiativeRollsHandler } from '@/accessors/combat/handlers/UpdateInitiativeRollsHandler'
import { ResolveInitiativeRequestHandler } from '@/accessors/combat/handlers/ResolveInitiativeRequestHandler'
import { LoadInitiativeRequestHandler } from '@/accessors/combat/handlers/LoadInitiativeRequestHandler'
import {
  StoreCombatSessionRequest,
  LoadCombatSessionRequest,
  UpdateCombatSessionRequest,
  StoreInitiativeRequestRequest,
  UpdateInitiativeRollsRequest,
  ResolveInitiativeRequestRequest,
  LoadInitiativeRequestRequest,
} from '@/accessors/combat/CombatRequests'

// Accessors — Fate
import { FateAccessor } from '@/accessors/fate/FateAccessor'
import { StoreFateEventHandler } from '@/accessors/fate/handlers/StoreFateEventHandler'
import { MarkFateRevealedHandler } from '@/accessors/fate/handlers/MarkFateRevealedHandler'
import { LoadFateLogHandler, LoadPendingFateHandler } from '@/accessors/fate/handlers/LoadFateLogHandler'
import { StoreFateEventRequest, MarkFateRevealedRequest, LoadFateLogRequest, LoadPendingFateRequest } from '@/accessors/fate/FateRequests'

// Accessors — Notification
import { NotificationAccessor } from '@/accessors/notification/NotificationAccessor'
import { SendPushHandler } from '@/accessors/notification/handlers/SendPushHandler'
import { StoreSubscriptionHandler } from '@/accessors/notification/handlers/StoreSubscriptionHandler'
import { StoreWhisperHandler } from '@/accessors/notification/handlers/StoreWhisperHandler'
import { LoadWhispersHandler } from '@/accessors/notification/handlers/LoadWhispersHandler'
import { SendPushRequest, StoreSubscriptionRequest, StoreWhisperRequest, LoadWhispersRequest } from '@/accessors/notification/NotificationRequests'

// Engines — Fate
import { FateEngine } from '@/engines/fate/FateEngine'
import { SelectTargetHandler } from '@/engines/fate/handlers/SelectTargetHandler'
import { SelectTargetRequest } from '@/engines/fate/FateEngineRequests'

// Engines — XP
import { XpEngine } from '@/engines/xp/XpEngine'
import { CalculateLevelHandler } from '@/engines/xp/handlers/CalculateLevelHandler'
import { CalculateLevelRequest } from '@/engines/xp/XpEngineRequests'

// Managers — Campaign
import { CampaignManager } from '@/managers/campaign/CampaignManager'
import { CreateCampaignHandler } from '@/managers/campaign/handlers/CreateCampaignHandler'
import { JoinCampaignHandler } from '@/managers/campaign/handlers/JoinCampaignHandler'
import { GetRosterHandler } from '@/managers/campaign/handlers/GetRosterHandler'
import { ValidateDmPinHandler } from '@/managers/campaign/handlers/ValidateDmPinHandler'
import { CreateCampaignRequest, JoinCampaignRequest, GetRosterRequest, ValidateDmPinRequest } from '@/managers/campaign/CampaignRequests'

// Managers — Character
import { CharacterManager } from '@/managers/character/CharacterManager'
import { UpdateHpHandler } from '@/managers/character/handlers/UpdateHpHandler'
import { UpdateConditionsHandler as ManagerUpdateConditionsHandler } from '@/managers/character/handlers/UpdateConditionsHandler'
import { UpdateDeathSavesHandler as ManagerUpdateDeathSavesHandler } from '@/managers/character/handlers/UpdateDeathSavesHandler'
import { UpdateSpellSlotsHandler as ManagerUpdateSpellSlotsHandler } from '@/managers/character/handlers/UpdateSpellSlotsHandler'
import { AwardXpHandler } from '@/managers/character/handlers/AwardXpHandler'
import { WhisperHandler } from '@/managers/character/handlers/WhisperHandler'
import { KickPlayerHandler } from '@/managers/character/handlers/KickPlayerHandler'
import { UpdateCharacterCurrencyHandler } from '@/managers/character/handlers/UpdateCharacterCurrencyHandler'
import { UpdateCharacterStatsHandler } from '@/managers/character/handlers/UpdateCharacterStatsHandler'
import { UpdateCharacterTokenHandler } from '@/managers/character/handlers/UpdateCharacterTokenHandler'
import {
  UpdateHpRequest,
  UpdateConditionsRequest,
  UpdateDeathSavesRequest,
  UpdateSpellSlotsRequest,
  AwardXpRequest,
  WhisperRequest,
  KickPlayerRequest,
  UpdateCharacterCurrencyRequest,
  UpdateCharacterStatsRequest,
  UpdateCharacterTokenRequest,
} from '@/managers/character/CharacterRequests'

// Managers — Combat
import { CombatManager } from '@/managers/combat/CombatManager'
import { StartCombatHandler } from '@/managers/combat/handlers/StartCombatHandler'
import { EndCombatHandler } from '@/managers/combat/handlers/EndCombatHandler'
import { NextTurnHandler } from '@/managers/combat/handlers/NextTurnHandler'
import { GetCombatSessionHandler } from '@/managers/combat/handlers/GetCombatSessionHandler'
import { RequestInitiativeHandler } from '@/managers/combat/handlers/RequestInitiativeHandler'
import { GetInitiativeRequestHandler } from '@/managers/combat/handlers/GetInitiativeRequestHandler'
import { SubmitInitiativeRollHandler } from '@/managers/combat/handlers/SubmitInitiativeRollHandler'
import { ResolveInitiativeHandler } from '@/managers/combat/handlers/ResolveInitiativeHandler'
import {
  StartCombatRequest,
  EndCombatRequest,
  NextTurnRequest,
  GetCombatSessionRequest,
  RequestInitiativeRequest,
  GetInitiativeRequestRequest,
  SubmitInitiativeRollRequest,
  ResolveInitiativeRequest,
} from '@/managers/combat/CombatRequests'

// Managers — Fate
import { FateManager } from '@/managers/fate/FateManager'
import { DrawFateHandler } from '@/managers/fate/handlers/DrawFateHandler'
import { RevealFateHandler } from '@/managers/fate/handlers/RevealFateHandler'
import { GetFateLogHandler, GetPendingFateHandler } from '@/managers/fate/handlers/GetFateLogHandler'
import { DrawFateRequest, RevealFateRequest, GetFateLogRequest, GetPendingFateRequest } from '@/managers/fate/FateRequests'

// Accessors — World
import { WorldAccessor } from '@/accessors/world/WorldAccessor'
import { StoreNpcHandler } from '@/accessors/world/handlers/StoreNpcHandler'
import { UpdateNpcHandler } from '@/accessors/world/handlers/UpdateNpcHandler'
import { SetNpcImageHandler as AccessorSetNpcImageHandler } from '@/accessors/world/handlers/SetNpcImageHandler'
import { StoreLocationHandler } from '@/accessors/world/handlers/StoreLocationHandler'
import { UpdateLocationHandler } from '@/accessors/world/handlers/UpdateLocationHandler'
import { SetLocationImageHandler as AccessorSetLocationImageHandler } from '@/accessors/world/handlers/SetLocationImageHandler'
import { StoreSessionNoteHandler } from '@/accessors/world/handlers/StoreSessionNoteHandler'
import { UpdateCampaignInventoryHandler } from '@/accessors/world/handlers/UpdateCampaignInventoryHandler'
import { UpdateCharacterLootHandler as AccessorUpdateCharacterLootHandler } from '@/accessors/world/handlers/UpdateCharacterLootHandler'
import { LoadNpcsHandler } from '@/accessors/world/handlers/LoadNpcsHandler'
import { LoadLocationsHandler } from '@/accessors/world/handlers/LoadLocationsHandler'
import { LoadSessionNotesHandler } from '@/accessors/world/handlers/LoadSessionNotesHandler'
import { LoadCampaignInventoryHandler } from '@/accessors/world/handlers/LoadCampaignInventoryHandler'
import { RemoveNpcHandler } from '@/accessors/world/handlers/RemoveNpcHandler'
import { RemoveLocationHandler } from '@/accessors/world/handlers/RemoveLocationHandler'
import { RemoveSessionNoteHandler } from '@/accessors/world/handlers/RemoveSessionNoteHandler'
import { StoreCustomTableHandler } from '@/accessors/world/handlers/StoreCustomTableHandler'
import { UpdateCustomTableHandler } from '@/accessors/world/handlers/UpdateCustomTableHandler'
import { LoadCustomTablesHandler } from '@/accessors/world/handlers/LoadCustomTablesHandler'
import { RemoveCustomTableHandler } from '@/accessors/world/handlers/RemoveCustomTableHandler'
import { StoreMapHandler } from '@/accessors/world/handlers/StoreMapHandler'
import { LoadMapsHandler } from '@/accessors/world/handlers/LoadMapsHandler'
import { RemoveMapHandler } from '@/accessors/world/handlers/RemoveMapHandler'
import { UpdateMapAccessHandler as AccessorUpdateMapAccessHandler } from '@/accessors/world/handlers/UpdateMapAccessHandler'
import { StoreBattleMapHandler } from '@/accessors/world/handlers/StoreBattleMapHandler'
import { LoadBattleMapsHandler } from '@/accessors/world/handlers/LoadBattleMapsHandler'
import { RemoveBattleMapHandler } from '@/accessors/world/handlers/RemoveBattleMapHandler'
import { UpdateBattleMapAccessHandler as AccessorUpdateBattleMapAccessHandler } from '@/accessors/world/handlers/UpdateBattleMapAccessHandler'
import { StoreQuestHandler } from '@/accessors/world/handlers/StoreQuestHandler'
import { UpdateQuestHandler } from '@/accessors/world/handlers/UpdateQuestHandler'
import { LoadQuestsHandler } from '@/accessors/world/handlers/LoadQuestsHandler'
import { RemoveQuestHandler } from '@/accessors/world/handlers/RemoveQuestHandler'
import {
  StoreNpcRequest,
  UpdateNpcRequest,
  SetNpcImageRequest as AccessorSetNpcImageRequest,
  StoreLocationRequest,
  UpdateLocationRequest as AccessorUpdateLocationRequest,
  SetLocationImageRequest as AccessorSetLocationImageRequest,
  StoreSessionNoteRequest,
  UpdateCampaignInventoryRequest,
  UpdateCharacterLootRequest as AccessorUpdateCharacterLootRequest,
  LoadNpcsRequest,
  LoadLocationsRequest,
  LoadSessionNotesRequest,
  LoadCampaignInventoryRequest,
  RemoveNpcRequest,
  RemoveLocationRequest,
  RemoveSessionNoteRequest,
  StoreCustomTableRequest,
  UpdateCustomTableRequest,
  LoadCustomTablesRequest,
  RemoveCustomTableRequest,
  StoreMapRequest,
  LoadMapsRequest,
  RemoveMapRequest,
  UpdateMapAccessRequest as AccessorUpdateMapAccessRequest,
  StoreBattleMapRequest,
  LoadBattleMapsRequest,
  RemoveBattleMapRequest,
  UpdateBattleMapAccessRequest as AccessorUpdateBattleMapAccessRequest,
  StoreQuestRequest,
  UpdateQuestRequest,
  LoadQuestsRequest,
  RemoveQuestRequest,
} from '@/accessors/world/WorldRequests'

// Accessors — BattleMap (tokens, fog, scale, annotations, custom token library)
import { BattleMapAccessor } from '@/accessors/battlemap/BattleMapAccessor'
import { StoreTokenHandler } from '@/accessors/battlemap/handlers/StoreTokenHandler'
import { UpdateTokenHandler as AccessorUpdateTokenHandler } from '@/accessors/battlemap/handlers/UpdateTokenHandler'
import { LoadTokensHandler } from '@/accessors/battlemap/handlers/LoadTokensHandler'
import { RemoveTokenHandler } from '@/accessors/battlemap/handlers/RemoveTokenHandler'
import { GetFogHandler as AccessorGetFogHandler } from '@/accessors/battlemap/handlers/GetFogHandler'
import { SetFogHandler as AccessorSetFogHandler } from '@/accessors/battlemap/handlers/SetFogHandler'
import { GetScaleHandler as AccessorGetScaleHandler } from '@/accessors/battlemap/handlers/GetScaleHandler'
import { SetScaleHandler as AccessorSetScaleHandler } from '@/accessors/battlemap/handlers/SetScaleHandler'
import { StoreAnnotationHandler } from '@/accessors/battlemap/handlers/StoreAnnotationHandler'
import { LoadAnnotationsHandler } from '@/accessors/battlemap/handlers/LoadAnnotationsHandler'
import { RemoveAnnotationHandler } from '@/accessors/battlemap/handlers/RemoveAnnotationHandler'
import { ClearAnnotationsHandler as AccessorClearAnnotationsHandler } from '@/accessors/battlemap/handlers/ClearAnnotationsHandler'
import { StoreLibraryEntryHandler } from '@/accessors/battlemap/handlers/StoreLibraryEntryHandler'
import { LoadLibraryHandler } from '@/accessors/battlemap/handlers/LoadLibraryHandler'
import { RemoveLibraryEntryHandler } from '@/accessors/battlemap/handlers/RemoveLibraryEntryHandler'
import {
  StoreTokenRequest,
  UpdateTokenRequest as AccessorUpdateTokenRequest,
  LoadTokensRequest,
  RemoveTokenRequest,
  GetFogRequest as AccessorGetFogRequest,
  SetFogRequest as AccessorSetFogRequest,
  GetScaleRequest as AccessorGetScaleRequest,
  SetScaleRequest as AccessorSetScaleRequest,
  StoreAnnotationRequest,
  LoadAnnotationsRequest,
  RemoveAnnotationRequest,
  ClearAnnotationsRequest as AccessorClearAnnotationsRequest,
  StoreLibraryEntryRequest,
  LoadLibraryRequest,
  RemoveLibraryEntryRequest,
} from '@/accessors/battlemap/BattleMapRequests'

// Managers — World
import { WorldManager } from '@/managers/world/WorldManager'
import { AddNpcHandler } from '@/managers/world/handlers/AddNpcHandler'
import { EditNpcHandler } from '@/managers/world/handlers/EditNpcHandler'
import { DeleteNpcHandler } from '@/managers/world/handlers/DeleteNpcHandler'
import { SetNpcImageHandler } from '@/managers/world/handlers/SetNpcImageHandler'
import { AddLocationHandler } from '@/managers/world/handlers/AddLocationHandler'
import { UpdateLocationHandler as ManagerUpdateLocationHandler } from '@/managers/world/handlers/UpdateLocationHandler'
import { DeleteLocationHandler } from '@/managers/world/handlers/DeleteLocationHandler'
import { SetLocationImageHandler } from '@/managers/world/handlers/SetLocationImageHandler'
import { AddSessionNoteHandler } from '@/managers/world/handlers/AddSessionNoteHandler'
import { DeleteSessionNoteHandler } from '@/managers/world/handlers/DeleteSessionNoteHandler'
import { UpdateInventoryHandler } from '@/managers/world/handlers/UpdateInventoryHandler'
import { UpdateCharacterLootHandler as ManagerUpdateCharacterLootHandler } from '@/managers/world/handlers/UpdateCharacterLootHandler'
import { GetNpcsHandler } from '@/managers/world/handlers/GetNpcsHandler'
import { GetLocationsHandler } from '@/managers/world/handlers/GetLocationsHandler'
import { GetSessionNotesHandler } from '@/managers/world/handlers/GetSessionNotesHandler'
import { GetInventoryHandler } from '@/managers/world/handlers/GetInventoryHandler'
import { AddCustomTableHandler } from '@/managers/world/handlers/AddCustomTableHandler'
import { EditCustomTableHandler } from '@/managers/world/handlers/EditCustomTableHandler'
import { DeleteCustomTableHandler } from '@/managers/world/handlers/DeleteCustomTableHandler'
import { GetCustomTablesHandler } from '@/managers/world/handlers/GetCustomTablesHandler'
import { AddMapHandler } from '@/managers/world/handlers/AddMapHandler'
import { GetMapsHandler } from '@/managers/world/handlers/GetMapsHandler'
import { DeleteMapHandler } from '@/managers/world/handlers/DeleteMapHandler'
import { UpdateMapAccessHandler } from '@/managers/world/handlers/UpdateMapAccessHandler'
import { AddBattleMapHandler } from '@/managers/world/handlers/AddBattleMapHandler'
import { GetBattleMapsHandler } from '@/managers/world/handlers/GetBattleMapsHandler'
import { DeleteBattleMapHandler } from '@/managers/world/handlers/DeleteBattleMapHandler'
import { UpdateBattleMapAccessHandler } from '@/managers/world/handlers/UpdateBattleMapAccessHandler'
import { AddQuestHandler } from '@/managers/world/handlers/AddQuestHandler'
import { EditQuestHandler } from '@/managers/world/handlers/EditQuestHandler'
import { DeleteQuestHandler } from '@/managers/world/handlers/DeleteQuestHandler'
import { GetQuestsHandler } from '@/managers/world/handlers/GetQuestsHandler'
import {
  AddNpcRequest,
  EditNpcRequest,
  DeleteNpcRequest,
  SetNpcImageRequest,
  AddLocationRequest,
  UpdateLocationRequest as ManagerUpdateLocationRequest,
  DeleteLocationRequest,
  SetLocationImageRequest,
  AddSessionNoteRequest,
  DeleteSessionNoteRequest,
  UpdateInventoryRequest,
  UpdateCharacterLootRequest as ManagerUpdateCharacterLootRequest,
  GetNpcsRequest,
  GetLocationsRequest,
  GetSessionNotesRequest,
  GetInventoryRequest,
  AddCustomTableRequest,
  EditCustomTableRequest,
  DeleteCustomTableRequest,
  GetCustomTablesRequest,
  AddMapRequest,
  GetMapsRequest,
  DeleteMapRequest,
  UpdateMapAccessRequest,
  AddBattleMapRequest,
  GetBattleMapsRequest,
  DeleteBattleMapRequest,
  UpdateBattleMapAccessRequest,
  AddQuestRequest,
  EditQuestRequest,
  DeleteQuestRequest,
  GetQuestsRequest,
} from '@/managers/world/WorldRequests'

// Managers — BattleMap
import { BattleMapManager } from '@/managers/battlemap/BattleMapManager'
import { AddTokenHandler } from '@/managers/battlemap/handlers/AddTokenHandler'
import { UpdateTokenHandler } from '@/managers/battlemap/handlers/UpdateTokenHandler'
import { DeleteTokenHandler } from '@/managers/battlemap/handlers/DeleteTokenHandler'
import { GetTokensHandler } from '@/managers/battlemap/handlers/GetTokensHandler'
import { GetFogHandler } from '@/managers/battlemap/handlers/GetFogHandler'
import { SetFogHandler } from '@/managers/battlemap/handlers/SetFogHandler'
import { GetScaleHandler } from '@/managers/battlemap/handlers/GetScaleHandler'
import { SetScaleHandler } from '@/managers/battlemap/handlers/SetScaleHandler'
import { GetAnnotationsHandler } from '@/managers/battlemap/handlers/GetAnnotationsHandler'
import { AddAnnotationHandler } from '@/managers/battlemap/handlers/AddAnnotationHandler'
import { DeleteAnnotationHandler } from '@/managers/battlemap/handlers/DeleteAnnotationHandler'
import { ClearAnnotationsHandler } from '@/managers/battlemap/handlers/ClearAnnotationsHandler'
import { GetLibraryHandler } from '@/managers/battlemap/handlers/GetLibraryHandler'
import { AddLibraryEntryHandler } from '@/managers/battlemap/handlers/AddLibraryEntryHandler'
import { DeleteLibraryEntryHandler } from '@/managers/battlemap/handlers/DeleteLibraryEntryHandler'
import {
  AddTokenRequest,
  UpdateTokenRequest,
  DeleteTokenRequest,
  GetTokensRequest,
  GetFogRequest,
  SetFogRequest,
  GetScaleRequest,
  SetScaleRequest,
  GetAnnotationsRequest,
  AddAnnotationRequest,
  DeleteAnnotationRequest,
  ClearAnnotationsRequest,
  GetLibraryRequest,
  AddLibraryEntryRequest,
  DeleteLibraryEntryRequest,
} from '@/managers/battlemap/BattleMapRequests'

import type { ICampaignManager } from '@/managers/campaign/ICampaignManager'
import type { IFateManager } from '@/managers/fate/IFateManager'
import type { ICharacterManager } from '@/managers/character/ICharacterManager'
import type { ICombatManager } from '@/managers/combat/ICombatManager'
import type { IWorldManager } from '@/managers/world/IWorldManager'
import type { IBattleMapManager } from '@/managers/battlemap/IBattleMapManager'

export interface Container {
  campaignManager: ICampaignManager
  fateManager: IFateManager
  characterManager: ICharacterManager
  combatManager: ICombatManager
  worldManager: IWorldManager
  battleMapManager: IBattleMapManager
}

export function createContainer(): Container {
  const db = createServiceClient()

  // ── Accessors ──────────────────────────────────────────────────────────────

  const campaignAccessor = new CampaignAccessor(
    new HandlerResolverBuilder()
      .register(StoreCampaignRequest, new StoreCampaignHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCampaignByCodeRequest, new LoadCampaignByCodeHandler(db))
      .build(),
  )

  const characterAccessor = new CharacterAccessor(
    new HandlerResolverBuilder()
      .register(StoreCharacterRequest, new StoreCharacterHandler(db))
      .register(UpdateCharacterHpRequest, new UpdateCharacterHpHandler(db))
      .register(UpdateCharacterConditionsRequest, new AccessorUpdateConditionsHandler(db))
      .register(AccessorUpdateDeathSavesRequest, new AccessorUpdateDeathSavesHandler(db))
      .register(AccessorUpdateSpellSlotsRequest, new AccessorUpdateSpellSlotsHandler(db))
      .register(UpdateXpRequest, new UpdateXpHandler(db))
      .register(KickCharacterRequest, new KickCharacterHandler(db))
      .register(AccessorUpdateCharacterCurrencyRequest, new AccessorUpdateCharacterCurrencyHandler(db))
      .register(AccessorUpdateCharacterStatsRequest, new AccessorUpdateCharacterStatsHandler(db))
      .register(AccessorUpdateCharacterTokenRequest, new AccessorUpdateCharacterTokenHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadRosterRequest, new LoadRosterHandler(db))
      .register(LoadCharacterRequest, new LoadCharacterHandler(db))
      .build(),
  )

  const combatAccessor = new CombatAccessor(
    new HandlerResolverBuilder()
      .register(StoreCombatSessionRequest, new StoreCombatSessionHandler(db))
      .register(UpdateCombatSessionRequest, new UpdateCombatSessionHandler(db))
      .register(StoreInitiativeRequestRequest, new StoreInitiativeRequestHandler(db))
      .register(UpdateInitiativeRollsRequest, new UpdateInitiativeRollsHandler(db))
      .register(ResolveInitiativeRequestRequest, new ResolveInitiativeRequestHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadCombatSessionRequest, new LoadCombatSessionHandler(db))
      .register(LoadInitiativeRequestRequest, new LoadInitiativeRequestHandler(db))
      .build(),
  )

  const fateAccessor = new FateAccessor(
    new HandlerResolverBuilder()
      .register(StoreFateEventRequest, new StoreFateEventHandler(db))
      .register(MarkFateRevealedRequest, new MarkFateRevealedHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadFateLogRequest, new LoadFateLogHandler(db))
      .register(LoadPendingFateRequest, new LoadPendingFateHandler(db))
      .build(),
  )

  const notificationAccessor = new NotificationAccessor(
    new HandlerResolverBuilder()
      .register(SendPushRequest, new SendPushHandler())
      .build(),
    new HandlerResolverBuilder()
      .register(StoreSubscriptionRequest, new StoreSubscriptionHandler(db))
      .register(StoreWhisperRequest, new StoreWhisperHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadWhispersRequest, new LoadWhispersHandler(db))
      .build(),
  )

  // ── Engines ────────────────────────────────────────────────────────────────

  const fateEngine = new FateEngine(
    new HandlerResolverBuilder()
      .register(SelectTargetRequest, new SelectTargetHandler())
      .build(),
  )

  const xpEngine = new XpEngine(
    new HandlerResolverBuilder()
      .register(CalculateLevelRequest, new CalculateLevelHandler())
      .build(),
  )

  // ── Managers ───────────────────────────────────────────────────────────────

  const campaignManager = new CampaignManager(
    new HandlerResolverBuilder()
      .register(CreateCampaignRequest, new CreateCampaignHandler(campaignAccessor))
      .register(JoinCampaignRequest, new JoinCampaignHandler(campaignAccessor, characterAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetRosterRequest, new GetRosterHandler(characterAccessor))
      .register(ValidateDmPinRequest, new ValidateDmPinHandler(campaignAccessor))
      .build(),
  )

  const characterManager = new CharacterManager(
    new HandlerResolverBuilder()
      .register(UpdateHpRequest, new UpdateHpHandler(characterAccessor))
      .register(UpdateConditionsRequest, new ManagerUpdateConditionsHandler(characterAccessor))
      .register(UpdateDeathSavesRequest, new ManagerUpdateDeathSavesHandler(characterAccessor))
      .register(UpdateSpellSlotsRequest, new ManagerUpdateSpellSlotsHandler(characterAccessor))
      .register(AwardXpRequest, new AwardXpHandler(characterAccessor, xpEngine, notificationAccessor))
      .register(WhisperRequest, new WhisperHandler(characterAccessor, notificationAccessor))
      .register(KickPlayerRequest, new KickPlayerHandler(characterAccessor))
      .register(UpdateCharacterCurrencyRequest, new UpdateCharacterCurrencyHandler(characterAccessor))
      .register(UpdateCharacterStatsRequest, new UpdateCharacterStatsHandler(characterAccessor))
      .register(UpdateCharacterTokenRequest, new UpdateCharacterTokenHandler(characterAccessor))
      .build(),
  )

  const combatManager = new CombatManager(
    new HandlerResolverBuilder()
      .register(StartCombatRequest, new StartCombatHandler(combatAccessor))
      .register(EndCombatRequest, new EndCombatHandler(combatAccessor))
      .register(NextTurnRequest, new NextTurnHandler(combatAccessor))
      .register(RequestInitiativeRequest, new RequestInitiativeHandler(combatAccessor))
      .register(SubmitInitiativeRollRequest, new SubmitInitiativeRollHandler(combatAccessor))
      .register(ResolveInitiativeRequest, new ResolveInitiativeHandler(combatAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetCombatSessionRequest, new GetCombatSessionHandler(combatAccessor))
      .register(GetInitiativeRequestRequest, new GetInitiativeRequestHandler(combatAccessor))
      .build(),
  )

  const fateManager = new FateManager(
    new HandlerResolverBuilder()
      .register(DrawFateRequest, new DrawFateHandler(fateEngine, fateAccessor, characterAccessor, notificationAccessor))
      .register(RevealFateRequest, new RevealFateHandler(fateAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetFateLogRequest, new GetFateLogHandler(fateAccessor))
      .register(GetPendingFateRequest, new GetPendingFateHandler(fateAccessor))
      .build(),
  )

  const worldAccessor = new WorldAccessor(
    new HandlerResolverBuilder()
      .register(StoreNpcRequest, new StoreNpcHandler(db))
      .register(UpdateNpcRequest, new UpdateNpcHandler(db))
      .register(AccessorSetNpcImageRequest, new AccessorSetNpcImageHandler(db))
      .register(StoreLocationRequest, new StoreLocationHandler(db))
      .register(AccessorUpdateLocationRequest, new UpdateLocationHandler(db))
      .register(AccessorSetLocationImageRequest, new AccessorSetLocationImageHandler(db))
      .register(StoreSessionNoteRequest, new StoreSessionNoteHandler(db))
      .register(UpdateCampaignInventoryRequest, new UpdateCampaignInventoryHandler(db))
      .register(AccessorUpdateCharacterLootRequest, new AccessorUpdateCharacterLootHandler(db))
      .register(StoreCustomTableRequest, new StoreCustomTableHandler(db))
      .register(UpdateCustomTableRequest, new UpdateCustomTableHandler(db))
      .register(StoreMapRequest, new StoreMapHandler(db))
      .register(AccessorUpdateMapAccessRequest, new AccessorUpdateMapAccessHandler(db))
      .register(StoreBattleMapRequest, new StoreBattleMapHandler(db))
      .register(AccessorUpdateBattleMapAccessRequest, new AccessorUpdateBattleMapAccessHandler(db))
      .register(StoreQuestRequest, new StoreQuestHandler(db))
      .register(UpdateQuestRequest, new UpdateQuestHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadNpcsRequest, new LoadNpcsHandler(db))
      .register(LoadLocationsRequest, new LoadLocationsHandler(db))
      .register(LoadSessionNotesRequest, new LoadSessionNotesHandler(db))
      .register(LoadCampaignInventoryRequest, new LoadCampaignInventoryHandler(db))
      .register(LoadCustomTablesRequest, new LoadCustomTablesHandler(db))
      .register(LoadMapsRequest, new LoadMapsHandler(db))
      .register(LoadBattleMapsRequest, new LoadBattleMapsHandler(db))
      .register(LoadQuestsRequest, new LoadQuestsHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveNpcRequest, new RemoveNpcHandler(db))
      .register(RemoveLocationRequest, new RemoveLocationHandler(db))
      .register(RemoveSessionNoteRequest, new RemoveSessionNoteHandler(db))
      .register(RemoveCustomTableRequest, new RemoveCustomTableHandler(db))
      .register(RemoveMapRequest, new RemoveMapHandler(db))
      .register(RemoveBattleMapRequest, new RemoveBattleMapHandler(db))
      .register(RemoveQuestRequest, new RemoveQuestHandler(db))
      .build(),
  )

  const worldManager = new WorldManager(
    new HandlerResolverBuilder()
      .register(AddNpcRequest, new AddNpcHandler(worldAccessor))
      .register(EditNpcRequest, new EditNpcHandler(worldAccessor))
      .register(DeleteNpcRequest, new DeleteNpcHandler(worldAccessor))
      .register(SetNpcImageRequest, new SetNpcImageHandler(worldAccessor))
      .register(AddLocationRequest, new AddLocationHandler(worldAccessor))
      .register(ManagerUpdateLocationRequest, new ManagerUpdateLocationHandler(worldAccessor))
      .register(DeleteLocationRequest, new DeleteLocationHandler(worldAccessor))
      .register(SetLocationImageRequest, new SetLocationImageHandler(worldAccessor))
      .register(AddSessionNoteRequest, new AddSessionNoteHandler(worldAccessor))
      .register(DeleteSessionNoteRequest, new DeleteSessionNoteHandler(worldAccessor))
      .register(UpdateInventoryRequest, new UpdateInventoryHandler(worldAccessor))
      .register(ManagerUpdateCharacterLootRequest, new ManagerUpdateCharacterLootHandler(worldAccessor))
      .register(AddCustomTableRequest, new AddCustomTableHandler(worldAccessor))
      .register(EditCustomTableRequest, new EditCustomTableHandler(worldAccessor))
      .register(DeleteCustomTableRequest, new DeleteCustomTableHandler(worldAccessor))
      .register(AddMapRequest, new AddMapHandler(worldAccessor))
      .register(DeleteMapRequest, new DeleteMapHandler(worldAccessor))
      .register(UpdateMapAccessRequest, new UpdateMapAccessHandler(worldAccessor))
      .register(AddBattleMapRequest, new AddBattleMapHandler(worldAccessor))
      .register(DeleteBattleMapRequest, new DeleteBattleMapHandler(worldAccessor))
      .register(UpdateBattleMapAccessRequest, new UpdateBattleMapAccessHandler(worldAccessor))
      .register(AddQuestRequest, new AddQuestHandler(worldAccessor))
      .register(EditQuestRequest, new EditQuestHandler(worldAccessor))
      .register(DeleteQuestRequest, new DeleteQuestHandler(worldAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetNpcsRequest, new GetNpcsHandler(worldAccessor))
      .register(GetLocationsRequest, new GetLocationsHandler(worldAccessor))
      .register(GetSessionNotesRequest, new GetSessionNotesHandler(worldAccessor))
      .register(GetInventoryRequest, new GetInventoryHandler(worldAccessor))
      .register(GetCustomTablesRequest, new GetCustomTablesHandler(worldAccessor))
      .register(GetMapsRequest, new GetMapsHandler(worldAccessor))
      .register(GetBattleMapsRequest, new GetBattleMapsHandler(worldAccessor))
      .register(GetQuestsRequest, new GetQuestsHandler(worldAccessor))
      .build(),
  )

  const battleMapAccessor = new BattleMapAccessor(
    new HandlerResolverBuilder()
      .register(StoreTokenRequest, new StoreTokenHandler(db))
      .register(AccessorUpdateTokenRequest, new AccessorUpdateTokenHandler(db))
      .register(AccessorSetFogRequest, new AccessorSetFogHandler(db))
      .register(AccessorSetScaleRequest, new AccessorSetScaleHandler(db))
      .register(StoreAnnotationRequest, new StoreAnnotationHandler(db))
      .register(StoreLibraryEntryRequest, new StoreLibraryEntryHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(LoadTokensRequest, new LoadTokensHandler(db))
      .register(AccessorGetFogRequest, new AccessorGetFogHandler(db))
      .register(AccessorGetScaleRequest, new AccessorGetScaleHandler(db))
      .register(LoadAnnotationsRequest, new LoadAnnotationsHandler(db))
      .register(LoadLibraryRequest, new LoadLibraryHandler(db))
      .build(),
    new HandlerResolverBuilder()
      .register(RemoveTokenRequest, new RemoveTokenHandler(db))
      .register(RemoveAnnotationRequest, new RemoveAnnotationHandler(db))
      .register(AccessorClearAnnotationsRequest, new AccessorClearAnnotationsHandler(db))
      .register(RemoveLibraryEntryRequest, new RemoveLibraryEntryHandler(db))
      .build(),
  )

  const battleMapManager = new BattleMapManager(
    new HandlerResolverBuilder()
      .register(AddTokenRequest, new AddTokenHandler(battleMapAccessor))
      .register(UpdateTokenRequest, new UpdateTokenHandler(battleMapAccessor))
      .register(DeleteTokenRequest, new DeleteTokenHandler(battleMapAccessor))
      .register(SetFogRequest, new SetFogHandler(battleMapAccessor))
      .register(SetScaleRequest, new SetScaleHandler(battleMapAccessor))
      .register(AddAnnotationRequest, new AddAnnotationHandler(battleMapAccessor))
      .register(DeleteAnnotationRequest, new DeleteAnnotationHandler(battleMapAccessor))
      .register(ClearAnnotationsRequest, new ClearAnnotationsHandler(battleMapAccessor))
      .register(AddLibraryEntryRequest, new AddLibraryEntryHandler(battleMapAccessor))
      .register(DeleteLibraryEntryRequest, new DeleteLibraryEntryHandler(battleMapAccessor))
      .build(),
    new HandlerResolverBuilder()
      .register(GetTokensRequest, new GetTokensHandler(battleMapAccessor))
      .register(GetFogRequest, new GetFogHandler(battleMapAccessor))
      .register(GetScaleRequest, new GetScaleHandler(battleMapAccessor))
      .register(GetAnnotationsRequest, new GetAnnotationsHandler(battleMapAccessor))
      .register(GetLibraryRequest, new GetLibraryHandler(battleMapAccessor))
      .build(),
  )

  return { campaignManager, fateManager, characterManager, combatManager, worldManager, battleMapManager }
}
