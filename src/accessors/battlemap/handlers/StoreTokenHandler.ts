import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreTokenRequest } from '../BattleMapRequests'
import { TokenResponse } from '../BattleMapResponses'
import type { BattleToken } from '@/types'

export class StoreTokenHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreTokenRequest

    let name = req.name.trim()
    if (!name) {
      const { count } = await this.db
        .from('battle_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('battle_map_id', req.battleMapId)
        .eq('base_name', req.baseName)
      name = `${req.baseName} ${(count ?? 0) + 1}`
    }

    const { data, error } = await this.db
      .from('battle_tokens')
      .insert({
        campaign_id: req.campaignId,
        battle_map_id: req.battleMapId,
        kind: req.kind,
        character_id: req.characterId,
        name,
        base_name: req.baseName,
        library_key: req.libraryKey,
        image_url: req.imageUrl,
        storage_path: req.storagePath,
        color: req.color,
        x: req.x,
        y: req.y,
      })
      .select()
      .single()

    if (error || !data) {
      return new TokenResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }

    return new TokenResponse(req.correlationId, rowToToken(data))
  }
}

export function rowToToken(row: Record<string, unknown>): BattleToken {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    battleMapId: row.battle_map_id as string,
    kind: row.kind as BattleToken['kind'],
    characterId: (row.character_id as string) ?? null,
    name: row.name as string,
    baseName: row.base_name as string,
    libraryKey: (row.library_key as string) ?? null,
    imageUrl: (row.image_url as string) ?? null,
    storagePath: (row.storage_path as string) ?? null,
    color: row.color as string,
    x: Number(row.x),
    y: Number(row.y),
    size: Number(row.size),
    visibleToPlayers: row.visible_to_players as boolean,
    showRange: row.show_range as boolean,
    statusEffects: (row.status_effects as BattleToken['statusEffects']) ?? [],
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}
