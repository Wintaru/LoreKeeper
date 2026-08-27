import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { GetLocationsRequest, AddLocationRequest } from '@/managers/world/WorldRequests'
import type { GetLocationsResponse, LocationResponse } from '@/managers/world/WorldResponses'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  const { worldManager } = createContainer()
  const result = (await worldManager.query(new GetLocationsRequest(campaignId))) as GetLocationsResponse

  return NextResponse.json({ locations: result.locations })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddLocationBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new AddLocationRequest(body.campaignId, body.name)
  )) as LocationResponse

  if (!result.success || !result.location) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ location: result.location }, { status: 201 })
}

function isAddLocationBody(value: unknown): value is { campaignId: string; name: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && typeof v.name === 'string' && typeof v.dmPin === 'string'
}
