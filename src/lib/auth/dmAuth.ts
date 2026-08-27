import { createServiceClient } from '@/lib/supabase/server'

// Shared DM-PIN verification for every DM-only API route. Previously these
// routes checked nothing beyond "does this campaignId/characterId exist" —
// any player (or anyone else who has the campaign code, which by design is
// shared with the whole party) could call them directly with full DM powers.
//
// This intentionally talks to Supabase directly rather than going through
// CampaignAccessor/CampaignManager: it mirrors the DM PIN hashing already
// duplicated in CreateCampaignHandler and campaigns/rejoin/route.ts, and it's
// a cross-cutting auth check called from ~30 route files, not campaign
// business logic that belongs behind the Manager/Accessor layers.

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Verify `dmPin` matches the given campaign's stored hash. */
export async function verifyDmPinForCampaign(campaignId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('campaigns').select('dm_pin_hash').eq('id', campaignId).single()
  if (!data) return false
  const hash = await hashPin(dmPin)
  return hash === (data.dm_pin_hash as string)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given character belongs to. */
export async function verifyDmPinForCharacter(characterId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data: character } = await db.from('characters').select('campaign_id').eq('id', characterId).single()
  if (!character) return false
  return verifyDmPinForCampaign(character.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given combat session belongs to. */
export async function verifyDmPinForCombatSession(sessionId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data: session } = await db.from('combat_sessions').select('campaign_id').eq('id', sessionId).single()
  if (!session) return false
  return verifyDmPinForCampaign(session.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given fate event belongs to. */
export async function verifyDmPinForFateEvent(fateEventId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data: event } = await db.from('fate_events').select('campaign_id').eq('id', fateEventId).single()
  if (!event) return false
  return verifyDmPinForCampaign(event.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given location belongs to. */
export async function verifyDmPinForLocation(locationId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('locations').select('campaign_id').eq('id', locationId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given NPC belongs to. */
export async function verifyDmPinForNpc(npcId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('npcs').select('campaign_id').eq('id', npcId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given session note belongs to. */
export async function verifyDmPinForSessionNote(noteId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('session_notes').select('campaign_id').eq('id', noteId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given custom table belongs to. */
export async function verifyDmPinForCustomTable(tableId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('custom_tables').select('campaign_id').eq('id', tableId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given (world) map belongs to. */
export async function verifyDmPinForMap(mapId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('campaign_maps').select('campaign_id').eq('id', mapId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given battle map belongs to. */
export async function verifyDmPinForBattleMap(battleMapId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('battle_maps').select('campaign_id').eq('id', battleMapId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given quest belongs to. */
export async function verifyDmPinForQuest(questId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('quests').select('campaign_id').eq('id', questId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given battle-map token belongs to. */
export async function verifyDmPinForToken(tokenId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('battle_tokens').select('campaign_id').eq('id', tokenId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given battle-map annotation belongs to. */
export async function verifyDmPinForAnnotation(annotationId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('battle_map_annotations').select('battle_map_id').eq('id', annotationId).single()
  if (!data) return false
  return verifyDmPinForBattleMap(data.battle_map_id as string, dmPin)
}

/** Verify `dmPin` matches the DM PIN for the campaign a given battle-token library entry belongs to. */
export async function verifyDmPinForLibraryEntry(entryId: string, dmPin: string | undefined): Promise<boolean> {
  if (!dmPin) return false
  const db = createServiceClient()
  const { data } = await db.from('battle_token_library').select('campaign_id').eq('id', entryId).single()
  if (!data) return false
  return verifyDmPinForCampaign(data.campaign_id as string, dmPin)
}
