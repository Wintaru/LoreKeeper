import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { DeleteAnnotationRequest } from '@/managers/battlemap/BattleMapRequests'
import type { DeleteResponse } from '@/managers/battlemap/BattleMapResponses'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ annotationId: string }> }
) {
  const { annotationId } = await params
  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(new DeleteAnnotationRequest(annotationId))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}
