import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { UpdateMapAccessRequest } from '@/managers/world/WorldRequests'
import type { DeleteResponse } from '@/managers/world/WorldResponses'
import type { MapViewport } from '@/types'

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isUpdateMapAccessBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new UpdateMapAccessRequest(
      body.campaignId,
      body.mapAccessGranted,
      body.sharedMapIds,
      body.mapViewport ?? null,
    )
  )) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

function isUpdateMapAccessBody(value: unknown): value is {
  campaignId: string
  mapAccessGranted: boolean
  sharedMapIds: string[]
  mapViewport?: MapViewport | null
  dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.campaignId === 'string' &&
    typeof v.mapAccessGranted === 'boolean' &&
    Array.isArray(v.sharedMapIds) &&
    typeof v.dmPin === 'string'
  )
}
