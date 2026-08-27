import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForMap } from '@/lib/auth/dmAuth'
import { DeleteMapRequest } from '@/managers/world/WorldRequests'
import type { DeleteResponse } from '@/managers/world/WorldResponses'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const { searchParams } = new URL(request.url)
  const storagePath = searchParams.get('storagePath')
  const dmPin = searchParams.get('dmPin') ?? undefined

  if (!storagePath) {
    return NextResponse.json({ error: 'storagePath is required' }, { status: 400 })
  }
  if (!(await verifyDmPinForMap(mapId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new DeleteMapRequest(mapId, storagePath)
  )) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
