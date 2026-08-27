import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { KickPlayerRequest } from '@/managers/character/CharacterRequests'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isKickBody(body)) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(new KickPlayerRequest(body.characterId))

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

function isKickBody(value: unknown): value is { characterId: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && typeof v.dmPin === 'string'
}
