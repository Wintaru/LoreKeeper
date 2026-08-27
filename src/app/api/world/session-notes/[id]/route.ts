import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForSessionNote } from '@/lib/auth/dmAuth'
import { DeleteSessionNoteRequest } from '@/managers/world/WorldRequests'
import type { DeleteResponse } from '@/managers/world/WorldResponses'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!(await verifyDmPinForSessionNote(id, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(new DeleteSessionNoteRequest(id))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return new Response(null, { status: 204 })
}
