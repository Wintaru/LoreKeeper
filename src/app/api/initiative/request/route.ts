import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import {
  RequestInitiativeRequest,
  GetInitiativeRequestRequest,
  ResolveInitiativeRequest,
} from '@/managers/combat/CombatRequests'
import type {
  RequestInitiativeResponse,
  GetInitiativeRequestResponse,
  ResolveInitiativeResponse,
} from '@/managers/combat/CombatResponses'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })

  const { combatManager } = createContainer()
  const result = (await combatManager.query(
    new GetInitiativeRequestRequest(campaignId)
  )) as GetInitiativeRequestResponse

  return NextResponse.json({ request: result.request })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isCampaignBody(body)) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { combatManager } = createContainer()
  const result = (await combatManager.execute(
    new RequestInitiativeRequest(body.campaignId)
  )) as RequestInitiativeResponse

  if (!result.success) return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  return NextResponse.json({ request: result.request }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!campaignId) return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { combatManager } = createContainer()
  const result = (await combatManager.execute(
    new ResolveInitiativeRequest(campaignId)
  )) as ResolveInitiativeResponse

  if (!result.success) return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  return NextResponse.json({ ok: true })
}

function isCampaignBody(value: unknown): value is { campaignId: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && typeof v.dmPin === 'string'
}
