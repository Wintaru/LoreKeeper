import type { CampaignPacket } from './schema'

function field(key: string, value: string | number | boolean | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  return `- ${key}: ${value}`
}

function joinFields(lines: (string | null)[]): string {
  return lines.filter((l): l is string => l !== null).join('\n')
}

/** Serializes a CampaignPacket back into the same Markdown shape the parser reads. */
export function packetToMarkdown(packet: CampaignPacket): string {
  const parts: string[] = []
  parts.push(`# Campaign: ${packet.campaignName ?? 'Untitled Campaign'}`)

  if (packet.npcs.length > 0) {
    parts.push('\n## NPCs')
    for (const n of packet.npcs) {
      parts.push(`\n### ${n.name}`)
      parts.push(joinFields([
        field('Faction', n.faction),
        field('Last Location', n.lastLocation),
        field('Notes', n.notes),
        field('Image', n.image),
      ]))
    }
  }

  if (packet.locations.length > 0) {
    parts.push('\n## Locations')
    for (const l of packet.locations) {
      parts.push(`\n### ${l.name}`)
      parts.push(joinFields([
        field('Visited', l.visited ? 'yes' : 'no'),
        field('Notes', l.notes),
        field('Image', l.image),
      ]))
    }
  }

  if (packet.quests.length > 0) {
    parts.push('\n## Quests')
    for (const q of packet.quests) {
      parts.push(`\n### ${q.title}`)
      parts.push(joinFields([
        field('Giver', q.giver),
        field('Objective', q.objective),
        field('Location', q.location),
        field('Complications', q.complications),
        field('Reward', q.reward),
        field('Difficulty', q.difficulty),
        field('Type', q.questType),
        field('Optional', q.isOptional ? 'yes' : 'no'),
        field('Public', q.isPublic ? 'yes' : 'no'),
      ]))
    }
  }

  if (packet.characters.length > 0) {
    parts.push('\n## Player Characters')
    for (const c of packet.characters) {
      parts.push(`\n### ${c.characterName}`)
      const scores = c.abilityScores
      const scoreLine = scores
        ? [
            scores.str !== null ? `STR ${scores.str}` : null,
            scores.dex !== null ? `DEX ${scores.dex}` : null,
            scores.con !== null ? `CON ${scores.con}` : null,
            scores.int !== null ? `INT ${scores.int}` : null,
            scores.wis !== null ? `WIS ${scores.wis}` : null,
            scores.cha !== null ? `CHA ${scores.cha}` : null,
          ].filter(Boolean).join(', ')
        : null
      parts.push(joinFields([
        field('Player', c.playerName),
        field('Class', c.characterClass),
        field('Level', c.level),
        field('Race', c.race),
        field('Background', c.background),
        field('Max HP', c.maxHp),
        field('Armor Class', c.armorClass),
        field('Speed', c.speed),
        field('Ability Scores', scoreLine),
        field('Personality Traits', c.personalityTraits),
        field('Ideals', c.ideals),
        field('Bonds', c.bonds),
        field('Flaws', c.flaws),
        field('Backstory', c.backstory),
        field('Portrait', c.portrait),
        field('Token Color', c.tokenColor),
      ]))
    }
  }

  if (packet.maps.length > 0) {
    parts.push('\n## Maps')
    for (const m of packet.maps) {
      parts.push(`\n### ${m.name}`)
      parts.push(joinFields([field('Type', m.type), field('Image', m.image)]))
    }
  }

  if (packet.battleMaps.length > 0) {
    parts.push('\n## Battle Maps')
    for (const m of packet.battleMaps) {
      parts.push(`\n### ${m.name}`)
      parts.push(joinFields([field('Type', m.type), field('Image', m.image)]))
    }
  }

  return parts.join('\n')
}
