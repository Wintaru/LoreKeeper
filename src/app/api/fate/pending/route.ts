import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { GetPendingFateRequest } from '@/managers/fate/FateRequests'
import type { GetFateLogResponse } from '@/managers/fate/FateResponses'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { fateManager } = createContainer()
  const result = (await fateManager.query(new GetPendingFateRequest(campaignId))) as GetFateLogResponse

  return NextResponse.json({ event: result.events[0] ?? null })
}
