'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Campaign } from '@/types'

export default function DmHomePage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (pin.length < 4) {
      setError('PIN must be at least 4 characters')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPin: pin }),
      })
      const data: unknown = await res.json()
      if (!res.ok || !isCampaignResponse(data)) {
        setError('Failed to create campaign')
        return
      }
      sessionStorage.setItem(`dm_pin_${data.campaign.code}`, pin)
      router.push(`/dm/campaign/${data.campaign.code}`)
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LoreKeeper</h1>
          <p className="text-stone-400 mt-1">Start a new campaign</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">DM PIN</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Choose a PIN"
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Confirm PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating…' : 'Create Campaign'}
          </button>
        </form>

        <p className="text-center text-stone-500 text-sm">
          Returning DM?{' '}
          <a href="/dm/rejoin" className="text-amber-400 hover:underline">Rejoin your campaign</a>
        </p>
        <p className="text-center text-stone-500 text-sm">
          Have a campaign packet?{' '}
          <a href="/dm/import" className="text-amber-400 hover:underline">Import a campaign</a>
        </p>
      </div>
    </main>
  )
}

function isCampaignResponse(value: unknown): value is { campaign: Campaign } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'campaign' in value &&
    typeof (value as Record<string, unknown>).campaign === 'object'
  )
}
