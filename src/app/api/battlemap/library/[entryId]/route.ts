import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForLibraryEntry } from '@/lib/auth/dmAuth'
import { DeleteLibraryEntryRequest } from '@/managers/battlemap/BattleMapRequests'
import type { DeleteResponse } from '@/managers/battlemap/BattleMapResponses'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params
  const { searchParams } = new URL(request.url)
  const storagePath = searchParams.get('storagePath')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!storagePath) return NextResponse.json({ error: 'storagePath is required' }, { status: 400 })
  if (!(await verifyDmPinForLibraryEntry(entryId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new DeleteLibraryEntryRequest(entryId, storagePath)
  )) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
