import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IBattleMapAccessor } from './IBattleMapAccessor'

export class BattleMapAccessor implements IBattleMapAccessor {
  constructor(
    private readonly storeResolver: HandlerResolver,
    private readonly loadResolver: HandlerResolver,
    private readonly removeResolver: HandlerResolver,
  ) {}

  async store(request: RequestBase): Promise<ResponseBase> {
    return this.storeResolver.resolve(request)
  }

  async load(request: RequestBase): Promise<ResponseBase> {
    return this.loadResolver.resolve(request)
  }

  async remove(request: RequestBase): Promise<ResponseBase> {
    return this.removeResolver.resolve(request)
  }
}
