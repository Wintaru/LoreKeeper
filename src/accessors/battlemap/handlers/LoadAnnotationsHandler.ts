import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { LoadAnnotationsRequest } from '../BattleMapRequests'
import { AnnotationsResponse } from '../BattleMapResponses'
import { rowToAnnotation } from './StoreAnnotationHandler'

export class LoadAnnotationsHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as LoadAnnotationsRequest
    const { data, error } = await this.db
      .from('battle_map_annotations')
      .select('*')
      .eq('battle_map_id', req.battleMapId)
      .order('created_at', { ascending: true })

    if (error) {
      return new AnnotationsResponse(req.correlationId, [], error.message)
    }
    return new AnnotationsResponse(req.correlationId, (data ?? []).map(rowToAnnotation))
  }
}
