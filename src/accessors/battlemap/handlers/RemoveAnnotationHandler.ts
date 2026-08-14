import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { RemoveAnnotationRequest } from '../BattleMapRequests'
import { AckResponse } from '../BattleMapResponses'

export class RemoveAnnotationHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as RemoveAnnotationRequest
    const { error } = await this.db
      .from('battle_map_annotations')
      .delete()
      .eq('id', req.annotationId)

    if (error) {
      return new AckResponse(req.correlationId, false, error.message)
    }
    return new AckResponse(req.correlationId, true)
  }
}
