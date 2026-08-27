import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForNpc } from '@/lib/auth/dmAuth'
import { EditNpcRequest, DeleteNpcRequest } from '@/managers/world/WorldRequests'
import type { NpcResponse, DeleteResponse } from '@/managers/world/WorldResponses'
import type { NpcRelationship } from '@/types'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body: unknown = await request.json()
  if (!isEditNpcBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForNpc(id, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new EditNpcRequest(
      id,
      body.name,
      body.faction ?? null,
      body.lastLocation ?? null,
      body.notes ?? null,
      body.relationships ?? [],
    )
  )) as NpcResponse

  if (!result.success || !result.npc) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ npc: result.npc })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!(await verifyDmPinForNpc(id, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(new DeleteNpcRequest(id))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return new Response(null, { status: 204 })
}

function isEditNpcBody(value: unknown): value is {
  name: string
  faction?: string | null
  lastLocation?: string | null
  notes?: string | null
  relationships?: NpcRelationship[]
  dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.name === 'string' && typeof v.dmPin === 'string'
}
