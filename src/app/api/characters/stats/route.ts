import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { UpdateCharacterStatsRequest } from '@/managers/character/CharacterRequests'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isUpdateStatsBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(
    new UpdateCharacterStatsRequest(body.characterId, body.maxHp, body.currentHp, body.armorClass)
  )

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

function isUpdateStatsBody(value: unknown): value is {
  characterId: string; maxHp: number; currentHp: number; armorClass: number; dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.characterId === 'string' &&
    typeof v.maxHp === 'number' &&
    typeof v.currentHp === 'number' &&
    typeof v.armorClass === 'number' &&
    typeof v.dmPin === 'string'
  )
}
