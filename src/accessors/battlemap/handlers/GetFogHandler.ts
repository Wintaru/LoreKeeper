import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GetFogRequest } from '../BattleMapRequests'
import { FogResponse } from '../BattleMapResponses'
import type { BattleMapFog } from '@/types'

export class GetFogHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetFogRequest
    const { data, error } = await this.db
      .from('battle_map_fog')
      .select('*')
      .eq('battle_map_id', req.battleMapId)
      .maybeSingle()

    if (error) {
      return new FogResponse(req.correlationId, null, error.message)
    }

    if (!data) {
      return new FogResponse(req.correlationId, { battleMapId: req.battleMapId, strokes: [], updatedAt: new Date() })
    }

    return new FogResponse(req.correlationId, rowToFog(data))
  }
}

export function rowToFog(row: Record<string, unknown>): BattleMapFog {
  return {
    battleMapId: row.battle_map_id as string,
    strokes: (row.strokes as BattleMapFog['strokes']) ?? [],
    updatedAt: new Date(row.updated_at as string),
  }
}
