import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GetScaleRequest } from '../BattleMapRequests'
import { ScaleResponse } from '../BattleMapResponses'
import type { BattleMapScale } from '@/types'

export class GetScaleHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetScaleRequest
    const { data, error } = await this.db
      .from('battle_map_scale')
      .select('*')
      .eq('battle_map_id', req.battleMapId)
      .maybeSingle()

    if (error) {
      return new ScaleResponse(req.correlationId, null, error.message)
    }

    if (!data) {
      return new ScaleResponse(req.correlationId, { battleMapId: req.battleMapId, feetPerUnit: 60, updatedAt: new Date() })
    }

    return new ScaleResponse(req.correlationId, rowToScale(data))
  }
}

export function rowToScale(row: Record<string, unknown>): BattleMapScale {
  return {
    battleMapId: row.battle_map_id as string,
    feetPerUnit: Number(row.feet_per_unit),
    updatedAt: new Date(row.updated_at as string),
  }
}
