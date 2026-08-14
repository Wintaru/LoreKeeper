import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadCampaignByCodeRequest } from '../CampaignRequests'
import { LoadCampaignByCodeResponse } from '../CampaignResponses'
import type { Campaign, InventoryItem, CustomCurrencyEntry, MapViewport } from '@/types'

export class LoadCampaignByCodeHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadCampaignByCodeRequest
    const { data, error } = await this.db
      .from('campaigns')
      .select()
      .eq('code', req.code.toUpperCase())
      .single()

    if (error || !data) {
      return new LoadCampaignByCodeResponse(req.correlationId, null, 'Campaign not found')
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
    return new LoadCampaignByCodeResponse(req.correlationId, campaign)
  }
}
