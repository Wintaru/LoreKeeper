// D&D 5e character-advancement reference data.
//
// This module is the single source of truth for XP thresholds and proficiency
// bonus. It previously existed as three separate copies of the same array — in
// the XP engine handler, the DM panel, and the player sheet — which meant a
// correction in one place silently diverged from the other two.
//
// Multiclassing note: none of the maths here changes when a character
// multiclasses. Per the SRD, "the experience point cost to gain a level is
// always based on your total character level... not your level in a particular
// class", and "your proficiency bonus is always based on your total character
// level". Total character level is simply the sum of every class level, so
// these functions keep taking a single total and stay correct as-is.

// Index 0 = level 1, index 19 = level 20.
export const XP_THRESHOLDS: readonly number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
]

export const MAX_CHARACTER_LEVEL = 20

/** Total character level implied by an XP total. */
export function xpToLevel(xp: number): number {
  let level = 1
  for (let i = XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= XP_THRESHOLDS[i]) { level = i + 1; break }
  }
  return Math.min(level, MAX_CHARACTER_LEVEL)
}

/** XP required to reach the next level, or null at the level cap. */
export function xpForNextLevel(level: number): number | null {
  return level >= MAX_CHARACTER_LEVEL ? null : XP_THRESHOLDS[level]
}

/** Proficiency bonus — driven by TOTAL character level, never by class level. */
export function proficiencyBonusForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_CHARACTER_LEVEL, level))
  return Math.floor((clamped - 1) / 4) + 2
}
