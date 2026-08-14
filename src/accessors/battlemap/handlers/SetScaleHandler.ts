import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SetScaleRequest } from '../BattleMapRequests'
import { ScaleResponse } from '../BattleMapResponses'
import { rowToScale } from './GetScaleHandler'

export class SetScaleHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetScaleRequest
    const { data, error } = await this.db
      .from('battle_map_scale')
      .upsert({ battle_map_id: req.battleMapId, feet_per_unit: req.feetPerUnit, updated_at: new Date().toISOString() })
      .select()
      .single()

    if (error || !data) {
      return new ScaleResponse(req.correlationId, null, error?.message ?? 'Update failed')
    }
    return new ScaleResponse(req.correlationId, rowToScale(data))
  }
}
