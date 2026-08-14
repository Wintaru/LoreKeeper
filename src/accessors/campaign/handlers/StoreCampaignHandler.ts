import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreCampaignRequest } from '../CampaignRequests'
import { StoreCampaignResponse } from '../CampaignResponses'
import type { Campaign, InventoryItem, CustomCurrencyEntry, MapViewport } from '@/types'

export class StoreCampaignHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreCampaignRequest
    const { data, error } = await this.db
      .from('campaigns')
      .insert({ code: req.code, dm_pin_hash: req.dmPinHash })
      .select()
      .single()

    if (error || !data) {
      return new StoreCampaignResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }

    const campaign: Campaign = {
      id: data.id,
      code: data.code,
      gold: (data.gold as number) ?? 0,
      silver: (data.silver as number) ?? 0,
      copper: (data.copper as number) ?? 0,
      customCurrency: (data.custom_currency as CustomCurrencyEntry[]) ?? [],
      sharedItems: (data.shared_items as InventoryItem[]) ?? [],
      mapAccessGranted: (data.map_access_granted as boolean) ?? false,
      sharedMapIds: (data.shared_map_ids as string[]) ?? [],
      mapViewport: (data.map_viewport as MapViewport | null) ?? null,
      battleMapAccessGranted: (data.battle_map_access_granted as boolean) ?? false,
      sharedBattleMapIds: (data.shared_battle_map_ids as string[]) ?? [],
      battleMapViewport: (data.battle_map_viewport as MapViewport | null) ?? null,
      createdAt: new Date(data.created_at),
      lastActiveAt: new Date(data.last_active_at),
      expiresAt: new Date(data.expires_at),
    }
    return new StoreCampaignResponse(req.correlationId, campaign)
  }
}
