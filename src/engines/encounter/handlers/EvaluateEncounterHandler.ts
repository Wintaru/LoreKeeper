import type { IHandler } from '@/common/resolver/IHandler'
import type { RequestBase } from '@/common/RequestBase'
import type { ResponseBase } from '@/common/ResponseBase'
import type { MonsterGroup, Character, EncounterDifficulty, EncounterBreakdown } from '@/types'
import { EvaluateEncounterRequest } from '../EncounterEngineRequests'
import { EvaluateEncounterResponse } from '../EncounterEngineResponses'

// D&D 5e XP thresholds per character per level (Easy / Medium / Hard / Deadly)
const XP_THRESHOLDS: Record<number, { easy: number; medium: number; hard: number; deadly: number }> = {
  1:  { easy: 25,   medium: 50,   hard: 75,   deadly: 100   },
  2:  { easy: 50,   medium: 100,  hard: 150,  deadly: 200   },
  3:  { easy: 75,   medium: 150,  hard: 225,  deadly: 400   },
  4:  { easy: 125,  medium: 250,  hard: 375,  deadly: 500   },
  5:  { easy: 250,  medium: 500,  hard: 750,  deadly: 1100  },
  6:  { easy: 300,  medium: 600,  hard: 900,  deadly: 1400  },
  7:  { easy: 350,  medium: 750,  hard: 1100, deadly: 1700  },
  8:  { easy: 450,  medium: 900,  hard: 1400, deadly: 2100  },
  9:  { easy: 550,  medium: 1100, hard: 1600, deadly: 2400  },
  10: { easy: 600,  medium: 1200, hard: 1900, deadly: 2800  },
  11: { easy: 800,  medium: 1600, hard: 2400, deadly: 3600  },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500  },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100  },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700  },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400  },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200  },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800  },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500  },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
}

// D&D 5e XP by CR
const CR_XP: Record<string, number> = {
  '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100,
  '5': 1800, '6': 2300, '7': 2900, '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400,
  '13': 10000, '14': 11500, '15': 13000, '16': 15000,
  '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000,
  '25': 75000, '26': 90000, '27': 105000, '28': 120000,
  '29': 135000, '30': 155000,
}

// D&D 5e encounter multiplier by total monster count
function encounterMultiplier(count: number): number {
  if (count === 1) return 1.0
  if (count === 2) return 1.5
  if (count <= 6) return 2.0
  if (count <= 10) return 2.5
  if (count <= 14) return 3.0
  return 4.0
}

// Party attack bonus by average level
function avgAttackBonus(avgLevel: number): number {
  if (avgLevel <= 4)  return 5
  if (avgLevel <= 8)  return 6
  if (avgLevel <= 12) return 7
  if (avgLevel <= 16) return 9
  return 11
}

// A character's effective level for encounter maths.
//
// This used to re-derive the level from `character.xp`. That is wrong: `level`
// is the stored total character level (the sum of the per-class levels) and is
// the only value the rest of the app trusts. XP no longer sets it — a DM
// running milestone levelling never awards XP at all, and a multiclassed
// character's level is only applied when the DM picks the class. Deriving from
// XP therefore rated a milestone-levelled level-8 party as level 1 and called
// every encounter Deadly.
function effectiveLevel(character: Character): number {
  return Math.max(1, Math.min(20, character.level))
}

// Piecewise interpolation mapping monsterXP → score 1–10
function piecewiseScore(
  xp: number,
  thresholds: { easy: number; medium: number; hard: number; deadly: number },
): number {
  const { easy, medium, hard, deadly } = thresholds
  if (xp <= 0) return 1
  if (xp < easy)    return 1 + (xp / easy) * 1                                      // 1–2
  if (xp < medium)  return 2 + ((xp - easy) / (medium - easy)) * 2                  // 2–4
  if (xp < hard)    return 4 + ((xp - medium) / (hard - medium)) * 2                // 4–6
  if (xp < deadly)  return 6 + ((xp - hard) / (deadly - hard)) * 2                  // 6–8
  return Math.min(10, 8 + ((xp - deadly) / deadly) * 2)                             // 8–10
}

function difficultyLabel(score: number): { label: string; colorClass: string } {
  if (score <= 2.0) return { label: 'Trivial',  colorClass: 'text-emerald-400' }
  if (score <= 3.5) return { label: 'Easy',     colorClass: 'text-green-400'   }
  if (score <= 5.0) return { label: 'Medium',   colorClass: 'text-yellow-400'  }
  if (score <= 6.5) return { label: 'Hard',     colorClass: 'text-orange-400'  }
  if (score <= 7.5) return { label: 'Deadly',   colorClass: 'text-red-400'     }
  if (score <= 9.0) return { label: 'Lethal',   colorClass: 'text-red-600'     }
  return                   { label: 'TPK',      colorClass: 'text-stone-300'   }
}

export class EvaluateEncounterHandler implements IHandler {
  async handle(request: RequestBase): Promise<ResponseBase> {
    const req = request as EvaluateEncounterRequest
    const { monsterGroups, party } = req

    if (monsterGroups.length === 0 || party.length === 0) {
      return new EvaluateEncounterResponse(req.correlationId, null, 'No monsters or party members')
    }

    // Party thresholds — sum per character at their level
    const activeParty = party.filter(c => c.isActive)
    const partyForCalc = activeParty.length > 0 ? activeParty : party
    const partyThresholds = partyForCalc.reduce(
      (acc, c) => {
        const t = XP_THRESHOLDS[effectiveLevel(c)]
        return { easy: acc.easy + t.easy, medium: acc.medium + t.medium, hard: acc.hard + t.hard, deadly: acc.deadly + t.deadly }
      },
      { easy: 0, medium: 0, hard: 0, deadly: 0 },
    )

    // Total raw XP and monster count
    const totalCount = monsterGroups.reduce((s, g) => s + g.count, 0)
    const totalRawXP = monsterGroups.reduce((s, g) => s + (CR_XP[g.monster.cr] ?? 0) * g.count, 0)
    const adjustedXP = totalRawXP * encounterMultiplier(totalCount)

    // XP-based score (main signal)
    const xpScore = piecewiseScore(adjustedXP, partyThresholds)

    // AC penalty — use the highest-AC monster
    const maxAC = Math.max(...monsterGroups.map(g => g.monster.ac))
    const avgLevel = partyForCalc.reduce((s, c) => s + effectiveLevel(c), 0) / partyForCalc.length
    const hitChance = Math.max(0.05, Math.min(0.95, (21 - maxAC + avgAttackBonus(avgLevel)) / 20))
    const acPenalty = hitChance < 0.35 ? 1.5 : hitChance < 0.5 ? 1.0 : hitChance < 0.65 ? 0.5 : 0

    // Immunity bonus — use the most-immune monster
    const maxImmunities = Math.max(...monsterGroups.map(g => g.monster.damageImmunities.length))
    const immunityBonus = Math.min(1.0, maxImmunities * 0.2)

    // Party HP penalty — reflects current battle attrition
    const totalMaxHp = partyForCalc.reduce((s, c) => s + c.maxHp, 0)
    const totalCurrentHp = partyForCalc.reduce((s, c) => s + c.currentHp, 0)
    const hpRatio = totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 1
    const hpPenalty = hpRatio < 0.4 ? 1.5 : hpRatio < 0.6 ? 1.0 : hpRatio < 0.8 ? 0.5 : 0

    // Special abilities bonus
    const hasLegendary = monsterGroups.some(g => g.monster.legendaryActions)
    const hasLair = monsterGroups.some(g => g.monster.lairActions)
    const specialBonus = (hasLegendary ? 0.5 : 0) + (hasLair ? 0.25 : 0)

    const raw = xpScore + acPenalty + immunityBonus + hpPenalty + specialBonus
    const score = Math.max(1, Math.min(10, Math.round(raw * 10) / 10))

    const { label, colorClass } = difficultyLabel(score)

    const breakdown: EncounterBreakdown = {
      xpScore: Math.round(xpScore * 10) / 10,
      acPenalty: Math.round(acPenalty * 10) / 10,
      immunityBonus: Math.round(immunityBonus * 10) / 10,
      hpPenalty: Math.round(hpPenalty * 10) / 10,
      specialBonus: Math.round(specialBonus * 10) / 10,
      adjustedXP: Math.round(adjustedXP),
      partyDeadlyThreshold: partyThresholds.deadly,
    }

    const difficulty: EncounterDifficulty = { score, label, colorClass, breakdown }
    return new EvaluateEncounterResponse(req.correlationId, difficulty)
  }
}
