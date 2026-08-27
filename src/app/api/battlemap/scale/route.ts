import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForBattleMap } from '@/lib/auth/dmAuth'
import { GetScaleRequest, SetScaleRequest } from '@/managers/battlemap/BattleMapRequests'
import type { ScaleResponse } from '@/managers/battlemap/BattleMapResponses'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const battleMapId = searchParams.get('battleMapId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!battleMapId) return NextResponse.json({ error: 'battleMapId is required' }, { status: 400 })
  if (!(await verifyDmPinForBattleMap(battleMapId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.query(new GetScaleRequest(battleMapId))) as ScaleResponse

  return NextResponse.json({ scale: result.scale })
}

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isSetScaleBody(body)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForBattleMap(body.battleMapId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new SetScaleRequest(body.battleMapId, body.feetPerUnit)
  )) as ScaleResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ scale: result.scale })
}

function isSetScaleBody(value: unknown): value is { battleMapId: string; feetPerUnit: number; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.battleMapId === 'string' && typeof v.feetPerUnit === 'number' && typeof v.dmPin === 'string'
}
