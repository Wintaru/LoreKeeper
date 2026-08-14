import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SetFogRequest } from '../BattleMapRequests'
import { FogResponse } from '../BattleMapResponses'
import { rowToFog } from './GetFogHandler'

export class SetFogHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetFogRequest
    const { data, error } = await this.db
      .from('battle_map_fog')
      .upsert({ battle_map_id: req.battleMapId, strokes: req.strokes, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error || !data) {
      return new FogResponse(req.correlationId, null, error?.message ?? 'Update failed')
    }
    return new FogResponse(req.correlationId, rowToFog(data))
  }
}
