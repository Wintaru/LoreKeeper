import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCustomTable } from '@/lib/auth/dmAuth'
import { EditCustomTableRequest, DeleteCustomTableRequest } from '@/managers/world/WorldRequests'
import type { CustomTableResponse, DeleteResponse } from '@/managers/world/WorldResponses'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body: unknown = await request.json()
  if (!isEditTableBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCustomTable(id, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new EditCustomTableRequest(id, body.name, body.entries)
  )) as CustomTableResponse

  if (!result.success || !result.table) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ table: result.table })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!(await verifyDmPinForCustomTable(id, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(new DeleteCustomTableRequest(id))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return new Response(null, { status: 204 })
}

function isEditTableBody(value: unknown): value is { name: string; entries: string[]; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.name === 'string' && Array.isArray(v.entries) && typeof v.dmPin === 'string'
}
