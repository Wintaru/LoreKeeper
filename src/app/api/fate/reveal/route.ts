import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { RevealFateRequest } from '@/managers/fate/FateRequests'
import type { RevealFateResponse } from '@/managers/fate/FateResponses'
import { verifyDmPinForFateEvent } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isRevealBody(body)) {
    return NextResponse.json({ error: 'fateEventId is required' }, { status: 400 })
  }
  if (!(await verifyDmPinForFateEvent(body.fateEventId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { fateManager } = createContainer()
  const result = (await fateManager.execute(
    new RevealFateRequest(body.fateEventId)
  )) as RevealFateResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ fateEvent: result.fateEvent })
}

function isRevealBody(value: unknown): value is { fateEventId: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.fateEventId === 'string' && typeof v.dmPin === 'string'
}
