import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { UpdateConditionsRequest } from '@/managers/character/CharacterRequests'
import type { Condition } from '@/types'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isUpdateConditionsBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(
    new UpdateConditionsRequest(body.characterId, body.conditions)
  )

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

function isUpdateConditionsBody(value: unknown): value is { characterId: string; conditions: Condition[]; dmPin: string } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && Array.isArray(v.conditions) && typeof v.dmPin === 'string'
}
