// Built-in NPC/enemy token library — emoji + color hex badges, no image upload needed.
// The DM can still add fully custom (uploaded photo) entries via the token library API.

export interface BuiltinLibraryEntry {
  key: string
  name: string
  emoji: string
  color: string
}

export const BUILTIN_LIBRARY: BuiltinLibraryEntry[] = [
  // Humanoids / NPCs
  { key: 'guard', name: 'Guard', emoji: '💂', color: '#57534e' },
  { key: 'bandit', name: 'Bandit', emoji: '🗡️', color: '#78350f' },
  { key: 'cultist', name: 'Cultist', emoji: '🕯️', color: '#581c87' },
  { key: 'thug', name: 'Thug', emoji: '👊', color: '#44403c' },
  { key: 'noble', name: 'Noble', emoji: '🎩', color: '#a16207' },
  { key: 'commoner', name: 'Commoner', emoji: '🧑', color: '#65a30d' },
  { key: 'acolyte', name: 'Acolyte', emoji: '📿', color: '#d97706' },
  { key: 'mage', name: 'Mage', emoji: '🧙', color: '#4338ca' },
  { key: 'priest', name: 'Priest', emoji: '⛪', color: '#eab308' },
  { key: 'scout', name: 'Scout', emoji: '🏹', color: '#166534' },
  { key: 'assassin', name: 'Assassin', emoji: '🥷', color: '#18181b' },
  { key: 'knight', name: 'Knight', emoji: '⚔️', color: '#334155' },
  { key: 'spy', name: 'Spy', emoji: '🕵️', color: '#3f3f46' },
  { key: 'merchant', name: 'Merchant', emoji: '💰', color: '#b45309' },
  { key: 'bard', name: 'Bard', emoji: '🎻', color: '#be185d' },
  { key: 'druid', name: 'Druid', emoji: '🍃', color: '#15803d' },
  { key: 'pirate', name: 'Pirate', emoji: '🏴‍☠️', color: '#1c1917' },
  { key: 'necromancer', name: 'Necromancer', emoji: '💀', color: '#3b0764' },
  { key: 'archer', name: 'Archer', emoji: '🎯', color: '#166534' },
  { key: 'berserker', name: 'Berserker', emoji: '🪓', color: '#991b1b' },

  // Goblinoids / Orcs
  { key: 'goblin', name: 'Goblin', emoji: '👺', color: '#22c55e' },
  { key: 'hobgoblin', name: 'Hobgoblin', emoji: '👹', color: '#ea580c' },
  { key: 'bugbear', name: 'Bugbear', emoji: '🐻', color: '#7c2d12' },
  { key: 'orc', name: 'Orc', emoji: '🗿', color: '#4d7c0f' },
  { key: 'orc_warchief', name: 'Orc War Chief', emoji: '🪖', color: '#3f6212' },
  { key: 'kobold', name: 'Kobold', emoji: '🦎', color: '#b91c1c' },

  // Undead
  { key: 'skeleton', name: 'Skeleton', emoji: '💀', color: '#d6d3d1' },
  { key: 'zombie', name: 'Zombie', emoji: '🧟', color: '#4d7c0f' },
  { key: 'ghoul', name: 'Ghoul', emoji: '🧟‍♂️', color: '#365314' },
  { key: 'wraith', name: 'Wraith', emoji: '👻', color: '#1e293b' },
  { key: 'ghost', name: 'Ghost', emoji: '👻', color: '#94a3b8' },
  { key: 'vampire', name: 'Vampire', emoji: '🧛', color: '#7f1d1d' },
  { key: 'lich', name: 'Lich', emoji: '☠️', color: '#312e81' },
  { key: 'mummy', name: 'Mummy', emoji: '🧟‍♀️', color: '#a8a29e' },
  { key: 'wight', name: 'Wight', emoji: '🥶', color: '#334155' },

  // Beasts
  { key: 'wolf', name: 'Wolf', emoji: '🐺', color: '#57534e' },
  { key: 'dire_wolf', name: 'Dire Wolf', emoji: '🐺', color: '#292524' },
  { key: 'bear', name: 'Bear', emoji: '🐻', color: '#78350f' },
  { key: 'giant_rat', name: 'Giant Rat', emoji: '🐀', color: '#57534e' },
  { key: 'giant_spider', name: 'Giant Spider', emoji: '🕷️', color: '#1c1917' },
  { key: 'boar', name: 'Boar', emoji: '🐗', color: '#44403c' },
  { key: 'eagle', name: 'Eagle', emoji: '🦅', color: '#92400e' },
  { key: 'snake', name: 'Snake', emoji: '🐍', color: '#166534' },
  { key: 'crocodile', name: 'Crocodile', emoji: '🐊', color: '#3f6212' },
  { key: 'bat_swarm', name: 'Bat Swarm', emoji: '🦇', color: '#27272a' },
  { key: 'owlbear', name: 'Owlbear', emoji: '🦉', color: '#57534e' },
  { key: 'giant_scorpion', name: 'Giant Scorpion', emoji: '🦂', color: '#78716c' },
  { key: 'spider_swarm', name: 'Spider Swarm', emoji: '🕸️', color: '#292524' },
  { key: 'horse', name: 'Horse', emoji: '🐴', color: '#78350f' },

  // Dragons / Drakes
  { key: 'red_dragon', name: 'Red Dragon', emoji: '🐉', color: '#b91c1c' },
  { key: 'blue_dragon', name: 'Blue Dragon', emoji: '🐉', color: '#1d4ed8' },
  { key: 'green_dragon', name: 'Green Dragon', emoji: '🐉', color: '#15803d' },
  { key: 'black_dragon', name: 'Black Dragon', emoji: '🐉', color: '#171717' },
  { key: 'white_dragon', name: 'White Dragon', emoji: '🐉', color: '#cbd5e1' },
  { key: 'gold_dragon', name: 'Gold Dragon', emoji: '🐲', color: '#ca8a04' },
  { key: 'wyvern', name: 'Wyvern', emoji: '🐲', color: '#57534e' },
  { key: 'drake', name: 'Drake', emoji: '🦎', color: '#65a30d' },

  // Giants / Trolls
  { key: 'hill_giant', name: 'Hill Giant', emoji: '🧌', color: '#4d7c0f' },
  { key: 'frost_giant', name: 'Frost Giant', emoji: '🧊', color: '#0e7490' },
  { key: 'fire_giant', name: 'Fire Giant', emoji: '🔥', color: '#c2410c' },
  { key: 'stone_giant', name: 'Stone Giant', emoji: '🪨', color: '#57534e' },
  { key: 'ogre', name: 'Ogre', emoji: '👹', color: '#854d0e' },
  { key: 'troll', name: 'Troll', emoji: '🧌', color: '#3f6212' },
  { key: 'cyclops', name: 'Cyclops', emoji: '👁️', color: '#78350f' },

  // Fiends
  { key: 'imp', name: 'Imp', emoji: '😈', color: '#7f1d1d' },
  { key: 'devil', name: 'Devil', emoji: '👿', color: '#991b1b' },
  { key: 'demon', name: 'Demon', emoji: '👹', color: '#5b21b6' },
  { key: 'hell_hound', name: 'Hell Hound', emoji: '🐕‍🦺', color: '#c2410c' },
  { key: 'quasit', name: 'Quasit', emoji: '😼', color: '#4c1d95' },

  // Elementals
  { key: 'fire_elemental', name: 'Fire Elemental', emoji: '🔥', color: '#ea580c' },
  { key: 'water_elemental', name: 'Water Elemental', emoji: '🌊', color: '#0284c7' },
  { key: 'earth_elemental', name: 'Earth Elemental', emoji: '⛰️', color: '#78716c' },
  { key: 'air_elemental', name: 'Air Elemental', emoji: '🌪️', color: '#94a3b8' },
  { key: 'magma_mephit', name: 'Magma Mephit', emoji: '🌋', color: '#dc2626' },

  // Constructs
  { key: 'animated_armor', name: 'Animated Armor', emoji: '🛡️', color: '#71717a' },
  { key: 'flesh_golem', name: 'Flesh Golem', emoji: '🧟', color: '#84cc16' },
  { key: 'stone_golem', name: 'Stone Golem', emoji: '🗿', color: '#57534e' },
  { key: 'clockwork_guardian', name: 'Clockwork Guardian', emoji: '⚙️', color: '#a16207' },

  // Fey
  { key: 'pixie', name: 'Pixie', emoji: '🧚', color: '#db2777' },
  { key: 'sprite', name: 'Sprite', emoji: '✨', color: '#a855f7' },
  { key: 'dryad', name: 'Dryad', emoji: '🌳', color: '#15803d' },
  { key: 'satyr', name: 'Satyr', emoji: '🐐', color: '#92400e' },
  { key: 'hag', name: 'Hag', emoji: '🧙‍♀️', color: '#3f3f46' },

  // Aberrations
  { key: 'mind_flayer', name: 'Mind Flayer', emoji: '🐙', color: '#581c87' },
  { key: 'beholder', name: 'Beholder', emoji: '👁️', color: '#7c2d12' },
  { key: 'gelatinous_cube', name: 'Gelatinous Cube', emoji: '🧊', color: '#22d3ee' },

  // Objectives / markers
  { key: 'treasure', name: 'Treasure Chest', emoji: '💎', color: '#ca8a04' },
  { key: 'objective', name: 'Objective Target', emoji: '🎯', color: '#dc2626' },
  { key: 'trap', name: 'Trap', emoji: '⚠️', color: '#b91c1c' },
  { key: 'lever', name: 'Lever', emoji: '🎚️', color: '#57534e' },
  { key: 'door', name: 'Door', emoji: '🚪', color: '#78350f' },
]
