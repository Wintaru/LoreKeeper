import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'

export interface IBattleMapAccessor {
  store(request: RequestBase): Promise<ResponseBase>
  load(request: RequestBase): Promise<ResponseBase>
  remove(request: RequestBase): Promise<ResponseBase>
}
