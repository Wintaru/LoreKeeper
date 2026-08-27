import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { exportCampaignToZip } from '@/lib/campaignPacket/exportOrchestrator'
import { verifyDmPinForCampaign } from '@/lib/auth/dmAuth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')
  const dmPin = searchParams.get('dmPin') ?? undefined
  if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  if (!(await verifyDmPinForCampaign(campaignId, dmPin))) {
    return NextResponse.json({ error: 'Invalid DM PIN' }, { status: 401 })
  }

  const db = createServiceClient()
  const { data: campaign, error } = await db.from('campaigns').select('code').eq('id', campaignId).single()
  if (error || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  try {
    const zipBuffer = await exportCampaignToZip(campaignId, campaign.code as string)
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${campaign.code}-campaign-packet.zip"`,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 })
  }
}
