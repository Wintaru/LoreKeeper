import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { parseCampaignPacket } from '@/lib/campaignPacket/parser'
import { docxBufferToMarkdown } from '@/lib/campaignPacket/docx'
import { importCampaignPacket } from '@/lib/campaignPacket/importOrchestrator'

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''
  let text: string | null = null
  const images = new Map<string, Buffer>()

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      const pastedText = formData.get('text')

      if (file instanceof File) {
        const buf = Buffer.from(await file.arrayBuffer())
        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = await JSZip.loadAsync(buf)
          let docEntry: JSZip.JSZipObject | null = null
          for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue
            const lower = path.toLowerCase()
            if (lower.startsWith('images/')) {
              const bytes = await entry.async('nodebuffer')
              images.set(path, bytes)
            } else if (lower.endsWith('.docx') || lower.endsWith('.md') || lower.endsWith('.txt')) {
              docEntry = entry
            }
          }
          if (!docEntry) {
            return NextResponse.json({ error: 'No campaign document (.docx, .md, or .txt) found in the zip' }, { status: 400 })
          }
          if (docEntry.name.toLowerCase().endsWith('.docx')) {
            const docxBuf = await docEntry.async('nodebuffer')
            text = await docxBufferToMarkdown(docxBuf)
          } else {
            text = await docEntry.async('text')
          }
        } else if (file.name.toLowerCase().endsWith('.docx')) {
          text = await docxBufferToMarkdown(buf)
        } else {
          text = buf.toString('utf-8')
        }
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
