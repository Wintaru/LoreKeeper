import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForBattleMap } from '@/lib/auth/dmAuth'
import { GetAnnotationsRequest, AddAnnotationRequest, ClearAnnotationsRequest } from '@/managers/battlemap/BattleMapRequests'
import type { AnnotationsResponse, AnnotationResponse, DeleteResponse } from '@/managers/battlemap/BattleMapResponses'
import type { AnnotationKind, PencilAnnotationData, TextAnnotationData, AoEAnnotationData } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const battleMapId = searchParams.get('battleMapId')
  if (!battleMapId) return NextResponse.json({ error: 'battleMapId is required' }, { status: 400 })

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.query(new GetAnnotationsRequest(battleMapId))) as AnnotationsResponse

  return NextResponse.json({ annotations: result.annotations })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddAnnotationBody(body)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForBattleMap(body.battleMapId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new AddAnnotationRequest(body.battleMapId, body.kind, body.data)
  )) as AnnotationResponse

  if (!result.success || !result.annotation) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ annotation: result.annotation }, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const battleMapId = searchParams.get('battleMapId')
  const kind = searchParams.get('kind') as AnnotationKind | null
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!battleMapId) return NextResponse.json({ error: 'battleMapId is required' }, { status: 400 })
  if (!(await verifyDmPinForBattleMap(battleMapId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new ClearAnnotationsRequest(battleMapId, kind)
  )) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

function isAddAnnotationBody(value: unknown): value is {
  battleMapId: string; kind: AnnotationKind; data: PencilAnnotationData | TextAnnotationData | AoEAnnotationData; dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.battleMapId === 'string' &&
    (v.kind === 'pencil' || v.kind === 'text' || v.kind === 'aoe') &&
    typeof v.data === 'object' && v.data !== null &&
    typeof v.dmPin === 'string'
  )
}
