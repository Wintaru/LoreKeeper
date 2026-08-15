import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SetLocationImageRequest } from '../WorldRequests'
import { StoreLocationResponse } from '../WorldResponses'
import { rowToLocation } from './StoreLocationHandler'

export class SetLocationImageHandler implements IHandler {
  constructor(private readonly db: SupabaseClient) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as SetLocationImageRequest
    const { data, error } = await this.db
      .from('locations')
      .update({ image_url: req.imageUrl, image_storage_path: req.imageStoragePath })
      .eq('id', req.locationId)
      .select()
      .single()

    if (error || !data) {
      return new StoreLocationResponse(req.correlationId, null, error?.message ?? 'Update failed')
    }
    return new StoreLocationResponse(req.correlationId, rowToLocation(data))
  }
}
