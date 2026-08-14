import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { DeleteBattleMapRequest } from '@/managers/world/WorldRequests'
import type { DeleteResponse } from '@/managers/world/WorldResponses'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mapId: string }> }
) {
  const { mapId } = await params
  const { searchParams } = new URL(request.url)
  const storagePath = searchParams.get('storagePath')

  if (!storagePath) {
    return NextResponse.json({ error: 'storagePath is required' }, { status: 400 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new DeleteBattleMapRequest(mapId, storagePath)
  )) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
