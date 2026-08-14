import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { GetTokensRequest, AddTokenRequest } from '@/managers/battlemap/BattleMapRequests'
import type { TokensResponse, TokenResponse } from '@/managers/battlemap/BattleMapResponses'
import type { TokenKind } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const battleMapId = searchParams.get('battleMapId')
  const forPlayers = searchParams.get('forPlayers') === 'true'
  if (!battleMapId) return NextResponse.json({ error: 'battleMapId is required' }, { status: 400 })

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.query(new GetTokensRequest(battleMapId))) as TokensResponse

  const tokens = forPlayers ? result.tokens.filter(t => t.visibleToPlayers) : result.tokens
  return NextResponse.json({ tokens })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddTokenBody(body)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new AddTokenRequest(
      body.campaignId, body.battleMapId, body.kind, body.characterId ?? null,
      body.name, body.baseName, body.libraryKey ?? null, body.imageUrl ?? null,
      body.storagePath ?? null, body.color, body.x, body.y,
    )
  )) as TokenResponse

  if (!result.success || !result.token) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ token: result.token }, { status: 201 })
}

function isAddTokenBody(value: unknown): value is {
  campaignId: string; battleMapId: string; kind: TokenKind; characterId?: string | null
  name: string; baseName: string; libraryKey?: string | null; imageUrl?: string | null
  storagePath?: string | null; color: string; x: number; y: number
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.campaignId === 'string' &&
    typeof v.battleMapId === 'string' &&
    (v.kind === 'player' || v.kind === 'npc') &&
    typeof v.name === 'string' &&
    typeof v.baseName === 'string' &&
    typeof v.color === 'string' &&
    typeof v.x === 'number' &&
    typeof v.y === 'number'
  )
}
