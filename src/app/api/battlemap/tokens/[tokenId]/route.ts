import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { UpdateTokenRequest, DeleteTokenRequest } from '@/managers/battlemap/BattleMapRequests'
import type { TokenResponse, DeleteResponse } from '@/managers/battlemap/BattleMapResponses'
import type { StatusEffect } from '@/types'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const body: unknown = await request.json()
  if (!isPatchBody(body)) {
    return NextResponse.json({ error: 'Invalid patch body' }, { status: 400 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new UpdateTokenRequest(tokenId, body)
  )) as TokenResponse

  if (!result.success || !result.token) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ token: result.token })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params
  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(new DeleteTokenRequest(tokenId))) as DeleteResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ success: true })
}

function isPatchBody(value: unknown): value is {
  name?: string; x?: number; y?: number; size?: number
  visibleToPlayers?: boolean; showRange?: boolean; statusEffects?: StatusEffect[]
  color?: string; imageUrl?: string | null; storagePath?: string | null
} {
  return typeof value === 'object' && value !== null
}
