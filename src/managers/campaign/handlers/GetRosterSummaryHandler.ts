import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { ICharacterAccessor } from '@/accessors/character/ICharacterAccessor'
import { LoadRosterSummaryRequest } from '@/accessors/character/CharacterRequests'
import { LoadRosterSummaryResponse } from '@/accessors/character/CharacterResponses'
import { GetRosterSummaryRequest } from '../CampaignRequests'
import { GetRosterSummaryResponse } from '../CampaignResponses'

export class GetRosterSummaryHandler implements IHandler {
  constructor(private readonly characterAccessor: ICharacterAccessor) {}

  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as GetRosterSummaryRequest
    const result = (await this.characterAccessor.load(
      new LoadRosterSummaryRequest(req.campaignId)
    )) as LoadRosterSummaryResponse

    if (!result.success) {
      return new GetRosterSummaryResponse(req.correlationId, [], result.errorMessage ?? 'Failed to load roster')
    }
    return new GetRosterSummaryResponse(req.correlationId, result.characters)
  }
}
