'use client'

import React, { useRef, useState } from 'react'
import { HEX_CLIP } from './HexToken'

const FRAME = 240
const OUT = 256

export function TokenImageCropper({
  onConfirm,
  onCancel,
}: {
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [natural, setNatural] = useState({ w: 1, h: 1 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  function handleFile(f: File) {
    setScale(1)
    setOffset({ x: 0, y: 0 })
    setImgUrl(URL.createObjectURL(f))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: offset.x, origY: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    setOffset({ x: dragRef.current.origX + (e.clientX - dragRef.current.startX), y: dragRef.current.origY + (e.clientY - dragRef.current.startY) })
  }
  function onPointerUp() { dragRef.current = null }

  const coverScale = natural.w > 0 && natural.h > 0 ? Math.max(FRAME / natural.w, FRAME / natural.h) : 1
  const dispW = natural.w * coverScale * scale
  const dispH = natural.h * coverScale * scale
  const left = (FRAME - dispW) / 2 + offset.x
  const top = (FRAME - dispH) / 2 + offset.y

  function confirm() {
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUT
    canvas.height = OUT
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const k = OUT / FRAME
    ctx.drawImage(img, 0, 0, natural.w, natural.h, left * k, top * k, dispW * k, dispH * k)
    canvas.toBlob(blob => { if (blob) onConfirm(blob) }, 'image/png', 0.92)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-stone-100">Upload Token Photo</h3>

        {!imgUrl ? (
          <label className="block border-2 border-dashed border-stone-700 rounded-lg p-8 text-center cursor-pointer hover:border-stone-600 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            <span className="text-sm text-stone-400">Click to select an image</span>
          </label>
        ) : (
          <>
            <p className="text-xs text-stone-500">Drag to reposition, use the slider to zoom. It&apos;ll be cropped to a hexagon.</p>
            <div
              className="relative mx-auto overflow-hidden rounded-lg bg-stone-950 cursor-move touch-none"
              style={{ width: FRAME, height: FRAME }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgUrl}
                alt="crop preview"
                draggable={false}
                className="absolute select-none max-w-none"
                onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                style={{ left, top, width: dispW, height: dispH }}
              />
              <div
                className="absolute inset-0 pointer-events-none border-2 border-amber-400/70"
                style={{ clipPath: HEX_CLIP }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">Zoom</span>
              <input
                type="range" min={1} max={3} step={0.05} value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setImgUrl(null)}
                className="flex-1 py-2 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 text-sm transition-colors"
              >Choose Different</button>
              <button
                onClick={confirm}
                className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors"
              >Use This Photo</button>
            </div>
          </>
        )}

        <button onClick={onCancel} className="w-full text-xs text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
      </div>
    </div>
  )
}
