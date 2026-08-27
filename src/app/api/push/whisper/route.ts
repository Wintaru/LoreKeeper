import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { WhisperRequest } from '@/managers/character/CharacterRequests'
import type { WhisperResponse } from '@/managers/character/CharacterResponses'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isWhisperBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = (await characterManager.execute(
    new WhisperRequest(body.characterId, body.message)
  )) as WhisperResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ sent: result.sent }, { status: 200 })
}

function isWhisperBody(value: unknown): value is { characterId: string; message: string; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && typeof v.message === 'string' && typeof v.dmPin === 'string'
}
