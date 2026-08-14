import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Campaign, InventoryItem, CustomCurrencyEntry, MapViewport } from '@/types'

export async function POST(request: Request) {
  const body: unknown = await request.json()
  if (!isRejoinBody(body)) {
    return NextResponse.json({ error: 'campaignCode and dmPin are required' }, { status: 400 })
  }

  const db = createServiceClient()
  const { data, error } = await db
    .from('campaigns')
    .select('id, code, gold, silver, copper, custom_currency, shared_items, map_access_granted, shared_map_ids, map_viewport, battle_map_access_granted, shared_battle_map_ids, battle_map_viewport, created_at, last_active_at, expires_at, dm_pin_hash')
    .eq('code', body.campaignCode.toUpperCase())
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const pinHash = await hashPin(body.dmPin)
  if (pinHash !== data.dm_pin_hash) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const campaign: Campaign = {
    id: data.id as string,
    code: data.code as string,
    gold: (data.gold as number) ?? 0,
    silver: (data.silver as number) ?? 0,
    copper: (data.copper as number) ?? 0,
    customCurrency: (data.custom_currency as CustomCurrencyEntry[]) ?? [],
    sharedItems: (data.shared_items as InventoryItem[]) ?? [],
    mapAccessGranted: (data.map_access_granted as boolean) ?? false,
    sharedMapIds: (data.shared_map_ids as string[]) ?? [],
    mapViewport: (data.map_viewport as MapViewport | null) ?? null,
    battleMapAccessGranted: (data.battle_map_access_granted as boolean) ?? false,
    sharedBattleMapIds: (data.shared_battle_map_ids as string[]) ?? [],
    battleMapViewport: (data.battle_map_viewport as MapViewport | null) ?? null,
    createdAt: new Date(data.created_at as string),
    lastActiveAt: new Date(data.last_active_at as string),
    expiresAt: new Date(data.expires_at as string),
  }

  return NextResponse.json({ campaign })
}

function isRejoinBody(value: unknown): value is { campaignCode: string; dmPin: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'campaignCode' in value &&
    'dmPin' in value &&
    typeof (value as Record<string, unknown>).campaignCode === 'string' &&
    typeof (value as Record<string, unknown>).dmPin === 'string'
  )
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
