import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { GetRosterSummaryRequest } from '@/managers/campaign/CampaignRequests'
import type { GetRosterSummaryResponse } from '@/managers/campaign/CampaignResponses'

// Lean, non-sensitive roster projection safe to call before a visitor has
// joined or proven who they are — see LoadRosterSummaryHandler for the field
// list. The full-Character /api/campaigns/roster endpoint is DM-only.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  const { campaignManager } = createContainer()
  const result = (await campaignManager.query(
    new GetRosterSummaryRequest(campaignId)
  )) as GetRosterSummaryResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage ?? 'Failed to load roster' }, { status: 500 })
  }

  return NextResponse.json({ characters: result.characters })
}
