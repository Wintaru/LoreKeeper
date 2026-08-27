import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { GetRosterRequest } from '@/managers/campaign/CampaignRequests'
import type { GetRosterResponse } from '@/managers/campaign/CampaignResponses'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const dmPin = searchParams.get('dmPin') ?? undefined

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { campaignManager } = createContainer()
  const result = (await campaignManager.query(
    new GetRosterRequest(campaignId)
  )) as GetRosterResponse

  return NextResponse.json({ characters: result.characters })
}
