import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SetNpcImageRequest } from '../WorldRequests'
import { StoreNpcResponse } from '../WorldResponses'
import { rowToNpc } from './StoreNpcHandler'

export class SetNpcImageHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetNpcImageRequest
    const { data, error } = await this.db
      .from('npcs')
      .update({ image_url: req.imageUrl, image_storage_path: req.imageStoragePath })
      .eq('id', req.npcId)
      .select()
      .single()

    if (error || !data) {
      return new StoreNpcResponse(req.correlationId, null, error?.message ?? 'Update failed')
    }
    return new StoreNpcResponse(req.correlationId, rowToNpc(data))
  }
}
