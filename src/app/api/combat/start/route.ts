import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { StartCombatRequest } from '@/managers/combat/CombatRequests'
import type { StartCombatResponse } from '@/managers/combat/CombatResponses'
import type { InitiativeEntry } from '@/types'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isStartBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { combatManager } = createContainer()
  const result = (await combatManager.execute(
    new StartCombatRequest(body.campaignId, body.initiativeOrder)
  )) as StartCombatResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ session: result.session }, { status: 201 })
}

function isStartBody(value: unknown): value is { campaignId: string; initiativeOrder: InitiativeEntry[]; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && Array.isArray(v.initiativeOrder) && typeof v.dmPin === 'string'
}
