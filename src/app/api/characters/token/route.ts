import { NextResponse } from 'next/server'
import { createContainer } from '@/container/DependencyContainer'
import { createServiceClient } from '@/lib/supabase/server'
import { UpdateCharacterTokenRequest } from '@/managers/character/CharacterRequests'

export async function POST(request: Request) {
  const formData = await request.formData()
  const characterId = formData.get('characterId')
  const color = formData.get('color')
  const file = formData.get('file')
  const clearImage = formData.get('clearImage')

  if (typeof characterId !== 'string' || typeof color !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const db = createServiceClient()
  let tokenImageUrl: string | null = null
  let tokenStoragePath: string | null = null

  if (file instanceof File) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const storagePath = `${characterId}/${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await db.storage
      .from('battle-tokens')
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = db.storage.from('battle-tokens').getPublicUrl(storagePath)
    tokenImageUrl = publicUrl
    tokenStoragePath = storagePath
  } else if (clearImage !== 'true') {
    // Keep whatever image is already set — just fetch current values so we don't null them out
    const { data } = await db.from('characters').select('token_image_url, token_storage_path').eq('id', characterId).single()
    tokenImageUrl = (data?.token_image_url as string) ?? null
    tokenStoragePath = (data?.token_storage_path as string) ?? null
  }

  const { characterManager } = createContainer()
  const result = await characterManager.execute(
    new UpdateCharacterTokenRequest(characterId, tokenImageUrl, tokenStoragePath, color)
  )

  if (!result.success) {
    return NextResponse.json({ error: result.errorMessage }, { status: 400 })
  }

  return NextResponse.json({ success: true, tokenImageUrl, tokenColor: color })
}
