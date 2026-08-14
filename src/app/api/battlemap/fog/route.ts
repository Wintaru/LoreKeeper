import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { GetFogRequest, SetFogRequest } from '@/managers/battlemap/BattleMapRequests'
import type { FogResponse } from '@/managers/battlemap/BattleMapResponses'
import type { FogStroke } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const battleMapId = searchParams.get('battleMapId')
  if (!battleMapId) return NextResponse.json({ error: 'battleMapId is required' }, { status: 400 })

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.query(new GetFogRequest(battleMapId))) as FogResponse

  return NextResponse.json({ fog: result.fog })
}

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isSetFogBody(body)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new SetFogRequest(body.battleMapId, body.strokes)
  )) as FogResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ fog: result.fog })
}

function isSetFogBody(value: unknown): value is { battleMapId: string; strokes: FogStroke[] } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.battleMapId === 'string' && Array.isArray(v.strokes)
}
