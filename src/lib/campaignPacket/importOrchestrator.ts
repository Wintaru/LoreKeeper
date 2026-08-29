import { createContainer } from '@/container/DependencyContainer'
import { createServiceClient } from '@/lib/supabase/server'
import { CreateCampaignRequest, JoinCampaignRequest } from '@/managers/campaign/CampaignRequests'
import type { CreateCampaignResponse, JoinCampaignResponse } from '@/managers/campaign/CampaignResponses'
import {
  AddNpcRequest, SetNpcImageRequest, AddLocationRequest, UpdateLocationRequest, SetLocationImageRequest,
  AddQuestRequest, EditQuestRequest, AddMapRequest, AddBattleMapRequest,
} from '@/managers/world/WorldRequests'
import type { NpcResponse, LocationResponse, QuestResponse, MapResponse, BattleMapResponse } from '@/managers/world/WorldResponses'
import { UpdateCharacterTokenRequest } from '@/managers/character/CharacterRequests'
import type { CampaignPacket } from './schema'

export interface ImportResult {
  campaignCode: string
  dmPin: string
  counts: { npcs: number; locations: number; quests: number; characters: number; maps: number; battleMaps: number }
  warnings: string[]
}

function contentTypeFor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  return 'image/jpeg'
}

/**
 * Imports a parsed Campaign Packet into a brand-new campaign. Always creates
 * a fresh campaign (never merges into an existing one) — this exists for
 * spinning up test/trial-run campaigns quickly, not for editing real ones.
 */
export async function importCampaignPacket(packet: CampaignPacket, images: Map<string, Buffer>): Promise<ImportResult> {
  const warnings = [...packet.warnings]
  const db = createServiceClient()
  const { campaignManager, worldManager, characterManager } = createContainer()

  async function uploadImage(bucket: string, folder: string, ref: string | null): Promise<{ url: string; path: string } | null> {
    if (!ref) return null
    const bytes = images.get(ref) ?? images.get(ref.replace(/^images\//, ''))
    if (!bytes) {
      warnings.push(`Image "${ref}" was referenced but not found in the uploaded package — skipped.`)
      return null
    }
    const ext = ref.split('.').pop() ?? 'jpg'
    const storagePath = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error } = await db.storage.from(bucket).upload(storagePath, bytes, { contentType: contentTypeFor(ref), upsert: false })
    if (error) {
      warnings.push(`Failed to upload image "${ref}": ${error.message}`)
      return null
    }
    const { data: { publicUrl } } = db.storage.from(bucket).getPublicUrl(storagePath)
    return { url: publicUrl, path: storagePath }
  }

  const dmPin = (packet.dmPin && /^\d{4,}$/.test(packet.dmPin)) ? packet.dmPin : String(Math.floor(1000 + Math.random() * 9000))
  const createResult = (await campaignManager.execute(new CreateCampaignRequest(dmPin))) as CreateCampaignResponse
  if (!createResult.success || !createResult.campaign) {
    throw new Error(createResult.errorMessage ?? 'Failed to create campaign')
  }
  const campaign = createResult.campaign

  let npcCount = 0
  for (const n of packet.npcs) {
    const img = await uploadImage('campaign-lore', campaign.id, n.image)
    const result = (await worldManager.execute(
      new AddNpcRequest(campaign.id, n.name, n.faction, n.lastLocation, n.notes, [])
    )) as NpcResponse
    if (result.success && result.npc && img) {
      await worldManager.execute(new SetNpcImageRequest(result.npc.id, img.url, img.path))
    }
    if (result.success) npcCount++
    else warnings.push(`Failed to create NPC "${n.name}": ${result.errorMessage ?? 'unknown error'}`)
  }

  let locationCount = 0
  for (const l of packet.locations) {
    const img = await uploadImage('campaign-lore', campaign.id, l.image)
    const result = (await worldManager.execute(new AddLocationRequest(campaign.id, l.name))) as LocationResponse
    if (result.success && result.location) {
      if (l.visited || l.notes) {
        // AddLocationRequest only sets name; fold in visited/notes via the same
        // full-replace update the DM edit UI uses.
        await worldManager.execute(new UpdateLocationRequest(result.location.id, l.visited, l.notes))
      }
      if (img) await worldManager.execute(new SetLocationImageRequest(result.location.id, img.url, img.path))
    }
    if (result.success) locationCount++
    else warnings.push(`Failed to create location "${l.name}": ${result.errorMessage ?? 'unknown error'}`)
  }

  let questCount = 0
  for (const q of packet.quests) {
    const result = (await worldManager.execute(
      new AddQuestRequest(campaign.id, q.title, q.description, q.giver, q.objective, q.location, q.complications, q.reward, q.difficulty, q.questType, q.isOptional)
    )) as QuestResponse
    if (result.success && result.quest && q.isPublic) {
      await worldManager.execute(new EditQuestRequest(
        result.quest.id, q.title, q.description, q.giver, q.objective, q.location, q.complications, q.reward,
        q.difficulty, q.questType, q.isOptional, true, result.quest.status,
      ))
    }
    if (result.success) questCount++
    else warnings.push(`Failed to create quest "${q.title}": ${result.errorMessage ?? 'unknown error'}`)
  }

  let characterCount = 0
  for (const c of packet.characters) {
    if (!c.characterClass) { warnings.push(`Character "${c.characterName}" has no Class set — skipped.`); continue }
    const details = {
      race: c.race ?? undefined,
      background: c.background ?? undefined,
      abilityScores: c.abilityScores && Object.values(c.abilityScores).some(v => v !== null)
        ? {
            str: c.abilityScores.str ?? 10, dex: c.abilityScores.dex ?? 10, con: c.abilityScores.con ?? 10,
            int: c.abilityScores.int ?? 10, wis: c.abilityScores.wis ?? 10, cha: c.abilityScores.cha ?? 10,
          }
        : undefined,
      speed: c.speed ?? undefined,
      personalityTraits: c.personalityTraits ?? undefined,
      ideals: c.ideals ?? undefined,
      bonds: c.bonds ?? undefined,
      flaws: c.flaws ?? undefined,
      backstory: c.backstory ?? undefined,
    }
    const result = (await campaignManager.execute(
      new JoinCampaignRequest(campaign.code, c.playerName || c.characterName, c.characterName, c.characterClass, c.level, c.maxHp, c.armorClass, [], details)
    )) as JoinCampaignResponse
    if (result.success && result.character) {
      const img = await uploadImage('battle-tokens', result.character.id, c.portrait)
      if (img || c.tokenColor) {
        await characterManager.execute(new UpdateCharacterTokenRequest(
          result.character.id, img?.url ?? null, img?.path ?? null, c.tokenColor ?? result.character.tokenColor,
        ))
      }
      characterCount++
    } else {
      warnings.push(`Failed to create character "${c.characterName}": ${result.errorMessage ?? 'unknown error'}`)
    }
  }

  let mapCount = 0
  for (const m of packet.maps) {
    const img = await uploadImage('campaign-maps', campaign.id, m.image)
    if (!img) { warnings.push(`Map "${m.name}" has no usable image — skipped.`); continue }
    const result = (await worldManager.execute(new AddMapRequest(campaign.id, m.name, m.type, img.path, img.url))) as MapResponse
    if (result.success) mapCount++
    else warnings.push(`Failed to create map "${m.name}": ${result.errorMessage ?? 'unknown error'}`)
  }

  let battleMapCount = 0
  for (const m of packet.battleMaps) {
    const img = await uploadImage('battle-maps', campaign.id, m.image)
    if (!img) { warnings.push(`Battle map "${m.name}" has no usable image — skipped.`); continue }
    const result = (await worldManager.execute(new AddBattleMapRequest(campaign.id, m.name, m.type, img.path, img.url))) as BattleMapResponse
    if (result.success) battleMapCount++
    else warnings.push(`Failed to create battle map "${m.name}": ${result.errorMessage ?? 'unknown error'}`)
  }

  return {
    campaignCode: campaign.code,
    dmPin,
    counts: { npcs: npcCount, locations: locationCount, quests: questCount, characters: characterCount, maps: mapCount, battleMaps: battleMapCount },
    warnings,
  }
}
