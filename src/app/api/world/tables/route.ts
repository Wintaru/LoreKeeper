import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { GetCustomTablesRequest, AddCustomTableRequest } from '@/managers/world/WorldRequests'
import type { GetCustomTablesResponse, CustomTableResponse } from '@/managers/world/WorldResponses'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  const { worldManager } = createContainer()
  const result = (await worldManager.query(new GetCustomTablesRequest(campaignId))) as GetCustomTablesResponse

  return NextResponse.json({ tables: result.tables })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddTableBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new AddCustomTableRequest(body.campaignId, body.name, body.entries)
  )) as CustomTableResponse

  if (!result.success || !result.table) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ table: result.table }, { status: 201 })
}

function isAddTableBody(value: unknown): value is { campaignId: string; name: string; entries: string[]; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.campaignId === 'string' &&
    typeof v.name === 'string' &&
    Array.isArray(v.entries) &&
    typeof v.dmPin === 'string'
  )
}
