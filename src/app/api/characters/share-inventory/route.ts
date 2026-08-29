import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { UpdateShareInventoryRequest } from '@/managers/character/CharacterRequests'

// Player self-service, like spell-slots/death-saves — a character's own
// UUID (held in the player's localStorage) is the only proof of ownership
// this app uses, and this is the character's own privacy choice about
// their own inventory. No DM PIN.
export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isShareInventoryBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(
    new UpdateShareInventoryRequest(body.characterId, body.share)
  )

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

function isShareInventoryBody(value: unknown): value is { characterId: string; share: boolean } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && typeof v.share === 'boolean'
}
