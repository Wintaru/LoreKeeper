import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'
import { GetMapsRequest, AddMapRequest } from '@/managers/world/WorldRequests'
import type { GetMapsResponse, MapResponse } from '@/managers/world/WorldResponses'
import type { MapType, MapViewport } from '@/types'

const MAP_TYPES: MapType[] = ['town', 'city', 'world', 'dungeon']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

  const db = createServiceClient()
  const { data: campaign } = await db
    .from('campaigns')
    .select('map_access_granted, shared_map_ids, map_viewport')
    .eq('id', campaignId)
    .single()

  const { worldManager } = createContainer()
  const result = (await worldManager.query(new GetMapsRequest(campaignId))) as GetMapsResponse

  return NextResponse.json({
    maps: result.maps,
    mapAccessGranted: (campaign?.map_access_granted as boolean) ?? false,
    sharedMapIds: (campaign?.shared_map_ids as string[]) ?? [],
    mapViewport: (campaign?.map_viewport as MapViewport | null) ?? null,
  })
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')
  const campaignId = formData.get('campaignId')
  const name = formData.get('name')
  const type = formData.get('type')
  const dmPin = formData.get('dmPin')

  if (
    !(file instanceof File) ||
    typeof campaignId !== 'string' ||
    typeof name !== 'string' ||
    typeof type !== 'string' ||
    typeof dmPin !== 'string' ||
    !MAP_TYPES.includes(type as MapType)
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
    .from('campaign-maps')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = db.storage.from('campaign-maps').getPublicUrl(storagePath)

  const { worldManager } = createContainer()
  const result = (await worldManager.execute(
    new AddMapRequest(campaignId, name, type as MapType, storagePath, publicUrl)
  )) as MapResponse

  if (!result.success || !result.map) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ map: result.map }, { status: 201 })
}
