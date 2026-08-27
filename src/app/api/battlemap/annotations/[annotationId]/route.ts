import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForAnnotation } from '@/lib/auth/dmAuth'
import { DeleteAnnotationRequest } from '@/managers/battlemap/BattleMapRequests'
import type { DeleteResponse } from '@/managers/battlemap/BattleMapResponses'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  const { annotationId } = await params
  const { searchParams } = new URL(request.url)
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!(await verifyDmPinForAnnotation(annotationId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }
  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(new DeleteAnnotationRequest(annotationId))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
