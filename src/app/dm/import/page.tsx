'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ImportResult {
  campaignCode: string
  dmPin: string
  counts: { npcs: number; locations: number; quests: number; characters: number; maps: number; battleMaps: number }
  warnings: string[]
}

const EXAMPLE = `# Campaign: The Sunken Reliquary

## Settings
- DM PIN: 4242

## NPCs
### Old Maren
- Faction: Dockside Guild
- Last Location: The Rusted Anchor Tavern
- Notes: Knows more than she lets on.

## Locations
### The Rusted Anchor Tavern
- Visited: no
- Notes: Where the party first meets.

## Quests
### Retrieve the Salt-Bound Ledger
- Giver: Old Maren
- Objective: a ledger hidden in the wreck
- Reward: 150 gp
- Public: yes

## Player Characters
### Kestrel Vane
- Player: Alex
- Class: Rogue
- Level: 3
- Race: Half-Elf
- Max HP: 24
- Armor Class: 15
- Ability Scores: STR 10, DEX 17, CON 12, INT 11, WIS 13, CHA 14

## Maps
### Port Callow
- Type: city
- Image: images/port-callow.png

## Battle Maps
### The Wreck's Hold
- Type: dungeon
- Image: images/wreck-hold.png
`

export default function ImportCampaignPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'paste' | 'file'>('paste')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleImport() {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      let res: Response
      if (mode === 'file' && file) {
        const urlRes = await fetch('/api/campaigns/import/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name }),
        })
        const urlData: unknown = await urlRes.json()
        if (!urlRes.ok) {
          const err = (urlData as Record<string, unknown>)?.error
          setError(typeof err === 'string' ? err : 'Could not start the upload')
          return
        }
        const { path, token } = urlData as { path: string; token: string }

        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('campaign-packet-uploads')
          .uploadToSignedUrl(path, token, file)
        if (uploadError) {
          setError(`Upload failed: ${uploadError.message}`)
          return
        }

        res = await fetch('/api/campaigns/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: path, filename: file.name }),
        })
      } else {
        res = await fetch('/api/campaigns/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      }
      const data: unknown = await res.json()
      if (!res.ok) {
        const err = (data as Record<string, unknown>)?.error
        setError(typeof err === 'string' ? err : 'Import failed')
        return
      }
      setResult(data as ImportResult)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const totalCreated = result
    ? result.counts.npcs + result.counts.locations + result.counts.quests + result.counts.characters + result.counts.maps + result.counts.battleMaps
    : 0

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-4">
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Import a Campaign</h1>
          <p className="text-stone-400 mt-1 text-sm">
            Paste a Campaign Packet, or upload a .txt/.md/.docx file — or a .zip containing the doc plus an{' '}
            <code className="text-stone-300">images/</code> folder if it references any images. This always creates a brand-new campaign.
          </p>
        </div>

        {result ? (
          <div className="bg-stone-900 border border-emerald-800/50 rounded-xl p-5 space-y-4">
            <p className="text-emerald-400 font-medium">Campaign created — {totalCreated} item{totalCreated !== 1 ? 's' : ''} added.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-950 border border-stone-800 rounded-lg p-3">
                <p className="text-xs text-stone-500 uppercase tracking-widest">Campaign Code</p>
                <p className="text-xl font-mono font-bold text-amber-400">{result.campaignCode}</p>
              </div>
              <div className="bg-stone-950 border border-stone-800 rounded-lg p-3">
                <p className="text-xs text-stone-500 uppercase tracking-widest">DM PIN</p>
                <p className="text-xl font-mono font-bold text-amber-400">{result.dmPin}</p>
              </div>
            </div>
            <ul className="text-sm text-stone-400 grid grid-cols-2 gap-x-4 gap-y-1">
              <li>NPCs: {result.counts.npcs}</li>
              <li>Locations: {result.counts.locations}</li>
              <li>Quests: {result.counts.quests}</li>
              <li>Characters: {result.counts.characters}</li>
              <li>Maps: {result.counts.maps}</li>
              <li>Battle Maps: {result.counts.battleMaps}</li>
            </ul>
            {result.warnings.length > 0 && (
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-amber-400 uppercase tracking-widest">Warnings</p>
                {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-300/80">{w}</p>)}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  sessionStorage.setItem(`dm_pin_${result.campaignCode}`, result.dmPin)
                  router.push(`/dm/campaign/${result.campaignCode}`)
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Open Campaign
              </button>
              <button
                onClick={() => { setResult(null); setText(''); setFile(null) }}
                className="px-4 py-2 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 transition-colors"
              >
                Import Another
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex border-b border-stone-800">
              <button onClick={() => setMode('paste')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'paste' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-stone-500'}`}>
                Paste Text
              </button>
              <button onClick={() => setMode('file')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${mode === 'file' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-stone-500'}`}>
                Upload File
              </button>
            </div>

            {mode === 'paste' ? (
              <div className="space-y-2">
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={EXAMPLE}
                  rows={16}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm font-mono text-stone-200 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button onClick={() => setText(EXAMPLE)} className="text-xs text-stone-500 hover:text-stone-300 underline">
                  Fill with example format
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed border-stone-700 rounded-lg p-8 text-center cursor-pointer hover:border-stone-600 transition-colors">
                <input
                  type="file"
                  accept=".txt,.md,.docx,.zip"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                <span className="text-sm text-stone-400">
                  {file ? file.name : 'Click to select a .txt, .md, .docx, or .zip file'}
                </span>
              </label>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={() => void handleImport()}
              disabled={loading || (mode === 'paste' ? !text.trim() : !file)}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Importing…' : 'Import Campaign'}
            </button>
          </>
        )}

        <p className="text-center text-stone-500 text-sm">
          <a href="/dm" className="text-amber-400 hover:underline">← Back</a>
        </p>
      </div>
    </main>
  )
}
