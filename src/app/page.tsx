import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <Image
            src="/lorekeeper-logo.png"
            alt="LoreKeeper"
            width={140}
            height={140}
            className="mx-auto mb-2"
            priority
          />
          <h1 className="text-4xl font-bold tracking-tight">LoreKeeper</h1>
          <p className="text-stone-400 mt-2">Your D&amp;D companion at the table</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/dm"
            className="block w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            I&apos;m the DM
          </Link>
          <Link
            href="/play"
            className="block w-full bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            I&apos;m a Player
          </Link>
        </div>

        <div className="text-stone-600 text-xs space-y-0.5 pt-2">
          <p>Made by Michael Donner</p>
          <p>Suggestions made by Joseph and Michael&apos;s party</p>
          <p>Thanks to Josh Donner for helping</p>
        </div>
      </div>
    </main>
  )
}
