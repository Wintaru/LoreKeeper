import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'campaign-packet-uploads'

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null)
  const filename = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).filename : null
  if (typeof filename !== 'string' || !filename) {
    return NextResponse.json({ error: 'filename is required' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'zip'
  const path = `uploads/${crypto.randomUUID()}.${ext}`

  const db = createServiceClient()
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Could not create an upload URL' }, { status: 500 })
  }

  return NextResponse.json({ path: data.path, token: data.token })
}
