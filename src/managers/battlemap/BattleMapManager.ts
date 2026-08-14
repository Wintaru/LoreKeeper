import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import { HandlerResolver } from '@/common/resolver/HandlerResolver'
import type { IBattleMapManager } from './IBattleMapManager'

export class BattleMapManager implements IBattleMapManager {
  constructor(
    private readonly executeResolver: HandlerResolver,
    private readonly queryResolver: HandlerResolver,
  ) {}

  async execute(request: RequestBase): Promise<ResponseBase> {
    return this.executeResolver.resolve(request)
  }

  async query(request: RequestBase): Promise<ResponseBase> {
    return this.queryResolver.resolve(request)
  }
}
