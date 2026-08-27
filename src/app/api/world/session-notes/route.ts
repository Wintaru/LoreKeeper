import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { GetSessionNotesRequest, AddSessionNoteRequest } from '@/managers/world/WorldRequests'
import type { GetSessionNotesResponse, SessionNoteResponse } from '@/managers/world/WorldResponses'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  const { worldManager } = createContainer()
  const result = (await worldManager.query(new GetSessionNotesRequest(campaignId))) as GetSessionNotesResponse

  return NextResponse.json({ notes: result.notes })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddNoteBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new AddSessionNoteRequest(body.campaignId, body.note)
  )) as SessionNoteResponse

  if (!result.success || !result.note) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ note: result.note }, { status: 201 })
}

function isAddNoteBody(value: unknown): value is { campaignId: string; note: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && typeof v.note === 'string' && typeof v.dmPin === 'string'
}
