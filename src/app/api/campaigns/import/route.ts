import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { parseCampaignPacket } from '@/lib/campaignPacket/parser'
import { docxBufferToMarkdown } from '@/lib/campaignPacket/docx'
import { importCampaignPacket } from '@/lib/campaignPacket/importOrchestrator'
import { createServiceClient } from '@/lib/supabase/server'

const UPLOAD_BUCKET = 'campaign-packet-uploads'

async function readPacketFile(buf: Buffer, filename: string): Promise<{ text: string; images: Map<string, Buffer> } | { error: string }> {
  const images = new Map<string, Buffer>()
  const lower = filename.toLowerCase()

  if (lower.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(buf)
    let docEntry: JSZip.JSZipObject | null = null
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue
      const p = path.toLowerCase()
      if (p.startsWith('images/')) {
        images.set(path, await entry.async('nodebuffer'))
      } else if (p.endsWith('.docx') || p.endsWith('.md') || p.endsWith('.txt')) {
        docEntry = entry
      }
    }
    if (!docEntry) return { error: 'No campaign document (.docx, .md, or .txt) found in the zip' }
    const text = docEntry.name.toLowerCase().endsWith('.docx')
      ? await docxBufferToMarkdown(await docEntry.async('nodebuffer'))
      : await docEntry.async('text')
    return { text, images }
  }
  if (lower.endsWith('.docx')) {
    return { text: await docxBufferToMarkdown(buf), images }
  }
  return { text: buf.toString('utf-8'), images }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  let text: string | null = null
  let images = new Map<string, Buffer>()
  let stagedStoragePath: string | null = null

  try {
    if (contentType.includes('application/json')) {
      const body: unknown = await request.json()
      const storagePath = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).storagePath : null
      const filename = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).filename : null

      if (typeof storagePath === 'string' && storagePath) {
        stagedStoragePath = storagePath
        const db = createServiceClient()
        const { data, error } = await db.storage.from(UPLOAD_BUCKET).download(storagePath)
        if (error || !data) {
          return NextResponse.json({ error: `Could not read the uploaded package: ${error?.message ?? 'not found'}` }, { status: 400 })
        }
        const buf = Buffer.from(await data.arrayBuffer())
        const result = await readPacketFile(buf, typeof filename === 'string' ? filename : storagePath)
        if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
        text = result.text
        images = result.images
      } else if (typeof (body as Record<string, unknown>)?.text === 'string') {
        text = (body as Record<string, unknown>).text as string
      }
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      const pastedText = formData.get('text')

      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer())
        const result = await readPacketFile(buf, file.name)
        if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
        text = result.text
        images = result.images
      } else if (typeof pastedText === 'string') {
        text = pastedText
      }
    } else {
      const body: unknown = await request.json()
      if (typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).text === 'string') {
        text = (body as Record<string, unknown>).text as string
      }
    }
  } catch (err) {
    return NextResponse.json({ error: `Could not read the uploaded package: ${err instanceof Error ? err.message : 'unknown error'}` }, { status: 400 })
  } finally {
    if (stagedStoragePath) {
      await createServiceClient().storage.from(UPLOAD_BUCKET).remove([stagedStoragePath])
    }
  }

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'No campaign text found — paste text, or upload a .txt/.md/.docx/.zip' }, { status: 400 })
  }

  const packet = parseCampaignPacket(text)

  if (packet.npcs.length + packet.locations.length + packet.quests.length + packet.characters.length + packet.maps.length + packet.battleMaps.length === 0) {
    return NextResponse.json({ error: 'Nothing recognizable was found in the document — check it follows the Campaign Packet format', warnings: packet.warnings }, { status: 400 })
  }

  try {
    const result = await importCampaignPacket(packet, images)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Import failed' }, { status: 500 })
  }
}
