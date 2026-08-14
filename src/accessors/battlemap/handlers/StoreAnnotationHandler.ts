import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StoreAnnotationRequest } from '../BattleMapRequests'
import { AnnotationResponse } from '../BattleMapResponses'
import type { BattleMapAnnotation } from '@/types'

export class StoreAnnotationHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as StoreAnnotationRequest
    const { data, error } = await this.db
      .from('battle_map_annotations')
      .insert({ battle_map_id: req.battleMapId, kind: req.kind, data: req.data })
      .select()
      .single()

    if (error || !data) {
      return new AnnotationResponse(req.correlationId, null, error?.message ?? 'Insert failed')
    }
    return new AnnotationResponse(req.correlationId, rowToAnnotation(data))
  }
}

export function rowToAnnotation(row: Record<string, unknown>): BattleMapAnnotation {
  return {
    id: row.id as string,
    battleMapId: row.battle_map_id as string,
    kind: row.kind as BattleMapAnnotation['kind'],
    data: row.data as BattleMapAnnotation['data'],
    createdAt: new Date(row.created_at as string),
  }
}
