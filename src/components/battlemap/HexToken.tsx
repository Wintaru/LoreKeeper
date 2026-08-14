'use client'

const HEX_CLIP = 'polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0% 50%)'

function initials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function HexToken({
  imageUrl,
  emoji,
  color,
  label,
  size = 40,
  ringClassName,
  dimmed = false,
  title,
}: {
  imageUrl?: string | null
  emoji?: string | null
  color: string
  label: string
  size?: number
  ringClassName?: string
  dimmed?: boolean
  title?: string
}) {
  return (
    <div
      title={title ?? label}
      className={`relative flex-shrink-0 ${ringClassName ?? ''}`}
      style={{ width: size, height: size, opacity: dimmed ? 0.4 : 1 }}
    >
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden select-none"
        style={{ clipPath: HEX_CLIP, backgroundColor: color }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="w-full h-full object-cover" draggable={false} />
        ) : emoji ? (
          <span style={{ fontSize: size * 0.55 }} className="leading-none">{emoji}</span>
        ) : (
          <span className="font-bold text-white" style={{ fontSize: size * 0.32 }}>{initials(label)}</span>
        )}
      </div>
    </div>
  )
}

export { HEX_CLIP }
