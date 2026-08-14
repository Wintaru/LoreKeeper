import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ClearAnnotationsRequest } from '../BattleMapRequests'
import { AckResponse } from '../BattleMapResponses'

export class ClearAnnotationsHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as ClearAnnotationsRequest
    let query = this.db.from('battle_map_annotations').delete().eq('battle_map_id', req.battleMapId)
    if (req.kind) query = query.eq('kind', req.kind)
    const { error } = await query

    if (error) {
      return new AckResponse(req.correlationId, false, error.message)
    }
    return new AckResponse(req.correlationId, true)
  }
}
