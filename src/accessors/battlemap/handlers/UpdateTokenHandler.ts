import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { UpdateTokenRequest } from '../BattleMapRequests'
import { TokenResponse } from '../BattleMapResponses'
import { rowToToken } from './StoreTokenHandler'

export class UpdateTokenHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as UpdateTokenRequest
    const p = req.patch
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (p.name !== undefined) update.name = p.name
    if (p.x !== undefined) update.x = p.x
    if (p.y !== undefined) update.y = p.y
    if (p.size !== undefined) update.size = p.size
    if (p.visibleToPlayers !== undefined) update.visible_to_players = p.visibleToPlayers
    if (p.showRange !== undefined) update.show_range = p.showRange
    if (p.statusEffects !== undefined) update.status_effects = p.statusEffects
    if (p.color !== undefined) update.color = p.color
    if (p.imageUrl !== undefined) update.image_url = p.imageUrl
    if (p.storagePath !== undefined) update.storage_path = p.storagePath

    const { data, error } = await this.db
      .from('battle_tokens')
      .update(update)
      .eq('id', req.tokenId)
      .select()
      .single()

    if (error || !data) {
      return new TokenResponse(req.correlationId, null, error?.message ?? 'Update failed')
    }

    return new TokenResponse(req.correlationId, rowToToken(data))
  }
}
