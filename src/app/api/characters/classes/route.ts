import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { LevelUpClassRequest, SetCharacterClassesRequest } from '@/managers/character/CharacterRequests'
import type { UpdateCharacterClassesResponse } from '@/managers/character/CharacterResponses'
import { verifyDmPinForCharacter } from '@/lib/auth/dmAuth'
import type { ClassLevel } from '@/types'

// Class changes are DM-only, matching the other level/stat mutation routes:
// POST takes a level in a class, PUT replaces the whole line-up (manual edit
// and undo).

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isLevelUpBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = (await characterManager.execute(
    new LevelUpClassRequest(body.characterId, body.className, body.hpGain, body.subclass ?? null)
  )) as UpdateCharacterClassesResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json(serialize(result), { status: 200 })
}

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isSetClassesBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCharacter(body.characterId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { characterManager } = createContainer()
  const result = (await characterManager.execute(
    new SetCharacterClassesRequest(body.characterId, body.classes, body.maxHp, body.currentHp)
  )) as UpdateCharacterClassesResponse

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json(serialize(result), { status: 200 })
}

function serialize(result: UpdateCharacterClassesResponse) {
  return {
    classes: result.classes,
    totalLevel: result.totalLevel,
    primaryClass: result.primaryClass,
    spellSlots: result.spellSlots,
    maxHp: result.maxHp,
    currentHp: result.currentHp,
    multiclassCasterLevel: result.multiclassCasterLevel,
  }
}

function isLevelUpBody(value: unknown): value is {
  characterId: string; className: string; hpGain: number; subclass?: string | null; dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.characterId === 'string' &&
    typeof v.className === 'string' && v.className.trim().length > 0 &&
    typeof v.hpGain === 'number' && Number.isFinite(v.hpGain) &&
    (v.subclass === undefined || v.subclass === null || typeof v.subclass === 'string') &&
    typeof v.dmPin === 'string'
  )
}

function isSetClassesBody(value: unknown): value is {
  characterId: string; classes: ClassLevel[]; maxHp: number; currentHp: number; dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.characterId === 'string' &&
    Array.isArray(v.classes) && v.classes.every(isClassLevel) &&
    typeof v.maxHp === 'number' && Number.isFinite(v.maxHp) &&
    typeof v.currentHp === 'number' && Number.isFinite(v.currentHp) &&
    typeof v.dmPin === 'string'
  )
}

function isClassLevel(value: unknown): value is ClassLevel {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.name === 'string' && v.name.trim().length > 0 &&
    typeof v.level === 'number' && Number.isInteger(v.level) && v.level > 0 &&
    (v.subclass === null || v.subclass === undefined || typeof v.subclass === 'string')
  )
}
