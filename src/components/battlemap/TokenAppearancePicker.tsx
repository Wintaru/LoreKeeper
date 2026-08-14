'use client'

import React, { useState } from 'react'
import type { Character } from '@/types'
import { HexToken } from './HexToken'
import { TokenImageCropper } from './TokenImageCropper'

export function TokenAppearancePicker({
  character,
  onUpdated,
}: {
  character: Character
  onUpdated: (patch: { tokenImageUrl: string | null; tokenColor: string }) => void
}) {
  const [showCropper, setShowCropper] = useState(false)
  const [color, setColor] = useState(character.tokenColor)
  const [saving, setSaving] = useState(false)

  async function save(blob: Blob | null, clearImage: boolean, nextColor: string) {
    setSaving(true)
    const fd = new FormData()
    fd.append('characterId', character.id)
    fd.append('color', nextColor)
    if (blob) fd.append('file', blob, 'token.png')
    if (clearImage) fd.append('clearImage', 'true')
    const res = await fetch('/api/characters/token', { method: 'POST', body: fd })
    const data = await res.json()
    setSaving(false)
    setShowCropper(false)
    if (data.success) onUpdated({ tokenImageUrl: data.tokenImageUrl ?? (clearImage ? null : character.tokenImageUrl), tokenColor: nextColor })
  }

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 flex items-center gap-4">
      <HexToken imageUrl={character.tokenImageUrl} color={color} label={character.characterName} size={56} />
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-stone-200">Battle Map Token</p>
        <p className="text-xs text-stone-500">Upload a photo, or pick a color for your hexagon.</p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCropper(true)}
            disabled={saving}
            className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-40"
          >Upload Photo</button>
          {character.tokenImageUrl && (
            <button
              onClick={() => void save(null, true, color)}
              disabled={saving}
              className="px-2.5 py-1 rounded text-xs font-medium border border-stone-700 text-stone-500 hover:text-red-400 transition-colors disabled:opacity-40"
            >Remove Photo</button>
          )}
          <input
            type="color" value={color}
            onChange={e => { setColor(e.target.value); void save(null, false, e.target.value) }}
            className="w-7 h-7 rounded cursor-pointer"
            title="Hexagon color"
          />
        </div>
      </div>

      {showCropper && (
        <TokenImageCropper
          onCancel={() => setShowCropper(false)}
          onConfirm={blob => void save(blob, false, color)}
        />
      )}
    </div>
  )
}
