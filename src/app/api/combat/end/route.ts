import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { EndCombatRequest } from '@/managers/combat/CombatRequests'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isEndBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { combatManager } = createContainer()
  const result = await combatManager.execute(new EndCombatRequest(body.campaignId))

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

function isEndBody(value: unknown): value is { campaignId: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && typeof v.dmPin === 'string'
}
