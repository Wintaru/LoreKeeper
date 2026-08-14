import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'

export interface IBattleMapManager {
  execute(request: RequestBase): Promise<ResponseBase>
  query(request: RequestBase): Promise<ResponseBase>
}
