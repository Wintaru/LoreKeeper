import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { verifyDmPinForCampaign, verifyDmPinForQuest } from '@/lib/auth/dmAuth'
import { AddQuestRequest, EditQuestRequest, DeleteQuestRequest, GetQuestsRequest } from '@/managers/world/WorldRequests'
import type { QuestResponse, GetQuestsResponse } from '@/managers/world/WorldResponses'
import type { QuestStatus } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const publicOnly = searchParams.get('publicOnly') === 'true'
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  const { worldManager } = createContainer()
  const result = (await worldManager.query(new GetQuestsRequest(campaignId, publicOnly))) as GetQuestsResponse
  return NextResponse.json({ quests: result.quests })
}

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isAddQuestBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(body.campaignId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }
  const { worldManager } = createContainer()
  const result = (await worldManager.execute(new AddQuestRequest(
    body.campaignId, body.title, body.description ?? null, body.giver ?? null,
    body.objective ?? null, body.location ?? null, body.complications ?? null,
    body.reward ?? null, body.difficulty ?? 1, body.questType ?? null,
    body.isOptional ?? true,
  ))) as QuestResponse

  if (!result.success || !result.quest) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ quest: result.quest }, { status: 201 })
}

export async function PUT(request: Request) {
  const body: unknown = await request.json()
  if (!isEditQuestBody(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForQuest(body.questId, body.dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }
  const { worldManager } = createContainer()
  const result = (await worldManager.execute(new EditQuestRequest(
    body.questId, body.title, body.description ?? null, body.giver ?? null,
    body.objective ?? null, body.location ?? null, body.complications ?? null,
    body.reward ?? null, body.difficulty ?? 1, body.questType ?? null,
    body.isOptional ?? true, body.isPublic ?? false, body.status ?? 'draft',
  ))) as QuestResponse

  if (!result.success || !result.quest) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }
  return NextResponse.json({ quest: result.quest })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const questId = searchParams.get('questId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!questId) return NextResponse.json({ error: 'questId is required' }, { status: 400 })
  if (!(await verifyDmPinForQuest(questId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { worldManager } = createContainer()
  await worldManager.execute(new DeleteQuestRequest(questId))
  return NextResponse.json({ success: true })
}

function isAddQuestBody(value: unknown): value is {
  campaignId: string
  title: string
  description?: string | null
  giver?: string | null
  objective?: string | null
  location?: string | null
  complications?: string | null
  reward?: string | null
  difficulty?: number
  questType?: string | null
  isOptional?: boolean
  dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.campaignId === 'string' && typeof v.title === 'string' && typeof v.dmPin === 'string'
}

function isEditQuestBody(value: unknown): value is {
  questId: string
  title: string
  description?: string | null
  giver?: string | null
  objective?: string | null
  location?: string | null
  complications?: string | null
  reward?: string | null
  difficulty?: number
  questType?: string | null
  isOptional?: boolean
  isPublic?: boolean
  status?: QuestStatus
  dmPin: string
} {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.questId === 'string' && typeof v.title === 'string' && typeof v.dmPin === 'string'
}
