import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { AwardXpRequest } from '@/managers/character/CharacterRequests'
import type { AwardXpResponse } from '@/managers/character/CharacterResponses'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAwardXpBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = (await characterManager.execute(
    new AwardXpRequest(body.characterId, body.xpToAdd)
  )) as AwardXpResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json(
    { newXp: result.newXp, newLevel: result.newLevel, leveledUp: result.leveledUp },
    { status: 200 }
  )
}

function isAwardXpBody(value: unknown): value is { characterId: string; xpToAdd: number; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && typeof v.xpToAdd === 'number' && typeof v.dmPin === 'string'
}
