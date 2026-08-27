import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { GetLibraryRequest, AddLibraryEntryRequest } from '@/managers/battlemap/BattleMapRequests'
import type { LibraryResponse, LibraryEntryResponse } from '@/managers/battlemap/BattleMapResponses'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.query(new GetLibraryRequest(campaignId))) as LibraryResponse

  return NextResponse.json({ entries: result.entries })
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  const campaignId = formData.get('campaignId')
  const name = formData.get('name')
  const color = formData.get('color')
  const dmPin = formData.get('dmPin')

  if (
    !(file instanceof File) ||
    typeof campaignId !== 'string' ||
    typeof name !== 'string' ||
    typeof color !== 'string' ||
    typeof dmPin !== 'string' ||
    !name.trim()
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${campaignId}/${crypto.randomUUID()}.${ext}`

  const db = createServiceClient()
  const { error: uploadError } = await db.storage
    .from('battle-tokens')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from('battle-tokens').getPublicUrl(storagePath)

  const { battleMapManager } = createContainer()
  const result = (await battleMapManager.execute(
    new AddLibraryEntryRequest(campaignId, name.trim(), name.trim(), publicUrl, storagePath, color)
  )) as LibraryEntryResponse

  if (!result.success || !result.entry) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ entry: result.entry }, { status: 201 })
}
