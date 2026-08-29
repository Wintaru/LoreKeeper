import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'

export interface ISpellcastingEngine {
  evaluate(request: RequestBase): Promise<ResponseBase>
}
