import JSZip from 'jszip'
import { createContainer } from '@/container/DependencyContainer'
import { GetRosterRequest } from '@/managers/campaign/CampaignRequests'
import type { GetRosterResponse } from '@/managers/campaign/CampaignResponses'
import { GetNpcsRequest, GetLocationsRequest, GetQuestsRequest, GetMapsRequest, GetBattleMapsRequest } from '@/managers/world/WorldRequests'
import type { GetNpcsResponse, GetLocationsResponse, GetQuestsResponse, GetMapsResponse, GetBattleMapsResponse } from '@/managers/world/WorldResponses'
import { packetToMarkdown } from './serializer'
import { markdownToDocxBuffer } from './docx'
import type { CampaignPacket, PacketAbilityScores } from './schema'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'image'
}

async function fetchImage(url: string | null, slug: string, used: Set<string>): Promise<{ ref: string; bytes: Buffer } | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    const ext = url.split('.').pop()?.split(/[?#]/)[0]?.toLowerCase()
    const safeExt = ext && /^[a-z0-9]{2,5}$/.test(ext) ? ext : 'jpg'
    let filename = `${slug}.${safeExt}`
    let n = 2
    while (used.has(filename)) { filename = `${slug}-${n}.${safeExt}`; n++ }
    used.add(filename)
    return { ref: `images/${filename}`, bytes }
  } catch {
    return null
  }
}

/** Gathers a campaign's data and builds a downloadable Campaign Packet zip (docx + images/). */
export async function exportCampaignToZip(campaignId: string, campaignCode: string): Promise<Buffer> {
  const { campaignManager, worldManager } = createContainer()
  const usedFilenames = new Set<string>()
  const imageFiles = new Map<string, Buffer>()

  const [rosterRes, npcsRes, locationsRes, questsRes, mapsRes, battleMapsRes] = await Promise.all([
    campaignManager.query(new GetRosterRequest(campaignId)) as Promise<GetRosterResponse>,
    worldManager.query(new GetNpcsRequest(campaignId)) as Promise<GetNpcsResponse>,
    worldManager.query(new GetLocationsRequest(campaignId)) as Promise<GetLocationsResponse>,
    worldManager.query(new GetQuestsRequest(campaignId)) as Promise<GetQuestsResponse>,
    worldManager.query(new GetMapsRequest(campaignId)) as Promise<GetMapsResponse>,
    worldManager.query(new GetBattleMapsRequest(campaignId)) as Promise<GetBattleMapsResponse>,
  ])

  const packet: CampaignPacket = {
    campaignName: `Campaign ${campaignCode}`,
    dmPin: null,
    npcs: [], locations: [], quests: [], characters: [], maps: [], battleMaps: [], warnings: [],
  }

  for (const n of npcsRes.npcs) {
    const img = await fetchImage(n.imageUrl, slugify(n.name), usedFilenames)
    if (img) imageFiles.set(img.ref, img.bytes)
    packet.npcs.push({ name: n.name, faction: n.faction, lastLocation: n.lastLocation, notes: n.notes, image: img?.ref ?? null })
  }

  for (const l of locationsRes.locations) {
    const img = await fetchImage(l.imageUrl, slugify(l.name), usedFilenames)
    if (img) imageFiles.set(img.ref, img.bytes)
    packet.locations.push({ name: l.name, visited: l.visited, notes: l.notes, image: img?.ref ?? null })
  }

  for (const q of questsRes.quests) {
    packet.quests.push({
      title: q.title, description: q.description, giver: q.giver, objective: q.objective, location: q.location, complications: q.complications,
      reward: q.reward, difficulty: q.difficulty, questType: q.questType, isOptional: q.isOptional, isPublic: q.isPublic,
    })
  }

  for (const c of rosterRes.characters) {
    const img = await fetchImage(c.tokenImageUrl, slugify(c.characterName), usedFilenames)
    if (img) imageFiles.set(img.ref, img.bytes)
    const scores: PacketAbilityScores | null = c.abilityScores
      ? { str: c.abilityScores.str, dex: c.abilityScores.dex, con: c.abilityScores.con, int: c.abilityScores.int, wis: c.abilityScores.wis, cha: c.abilityScores.cha }
      : null
    packet.characters.push({
      characterName: c.characterName, playerName: c.playerName, characterClass: c.class, level: c.level,
      race: c.race, background: c.background, maxHp: c.maxHp, armorClass: c.armorClass, speed: c.speed,
      abilityScores: scores, personalityTraits: c.personalityTraits, ideals: c.ideals, bonds: c.bonds,
      flaws: c.flaws, backstory: c.backstory, portrait: img?.ref ?? null, tokenColor: c.tokenColor,
    })
  }

  for (const m of mapsRes.maps) {
    const img = await fetchImage(m.imageUrl, slugify(m.name), usedFilenames)
    if (img) imageFiles.set(img.ref, img.bytes)
    packet.maps.push({ name: m.name, type: m.type, image: img?.ref ?? null })
  }

  for (const m of battleMapsRes.maps) {
    const img = await fetchImage(m.imageUrl, slugify(m.name), usedFilenames)
    if (img) imageFiles.set(img.ref, img.bytes)
    packet.battleMaps.push({ name: m.name, type: m.type, image: img?.ref ?? null })
  }

  const markdown = packetToMarkdown(packet)
  const docxBuffer = await markdownToDocxBuffer(markdown)

  const zip = new JSZip()
  zip.file('campaign.docx', docxBuffer)
  for (const [ref, bytes] of imageFiles) zip.file(ref, bytes)

  return zip.generateAsync({ type: 'nodebuffer' })
}
