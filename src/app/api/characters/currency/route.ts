import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { UpdateCharacterCurrencyRequest } from '@/managers/character/CharacterRequests'
import type { CustomCurrencyEntry } from '@/types'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isUpdateCurrencyBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(
    new UpdateCharacterCurrencyRequest(
      body.characterId,
      body.gold ?? 0,
      body.silver ?? 0,
      body.copper ?? 0,
      body.customCurrency ?? [],
    )
  )

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

function isUpdateCurrencyBody(value: unknown): value is {
  characterId: string
  gold?: number
  silver?: number
  copper?: number
  customCurrency?: CustomCurrencyEntry[]
  dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.characterId === 'string' && typeof v.dmPin === 'string'
}
