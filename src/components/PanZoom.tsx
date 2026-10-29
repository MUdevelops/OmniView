import { useEffect, useRef, useState, type ReactNode } from 'react'
export type Pixels = ImageData | HTMLCanvasElement
const clamp = (v: number) => Math.min(32, Math.max(0.05, v))
const btn = 'rounded border px-3 py-1 text-sm'
export interface PanZoomProps {
  source?: Pixels | null   // canvas-backed image …
  url?: string             // … or an <img> URL (keeps GIF animation)
  resetKey: string; label: string
  extra?: ReactNode; overlay?: ReactNode
  initialRotation?: number
  onSize?: (w: number, h: number) => void; onError?: () => void
}

/** Zoom (wheel, pinch, buttons, +/-/0 keys), pan (drag), fit/fill/100% and rotate. View-only. */
export default function PanZoom({ source = null, url, resetKey, label, extra, overlay, initialRotation = 0, onSize, onError }: PanZoomProps) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [z, setZ] = useState(1); const [rot, setRot] = useState(initialRotation)
  const [pan, setPan] = useState({ x: 0, y: 0 }); const [nat, setNat] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ w: 0, h: 0 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const lastDist = useRef(0)
  const w = source ? source.width : nat.w; const h = source ? source.height : nat.h
  const fit = w && h && view.w && view.h ? Math.min(1, view.w / w, view.h / h) : 1
  const fill = w && h && view.w && view.h ? Math.max(view.w / w, view.h / h) : 1

  useEffect(() => { setZ(1); setRot(initialRotation); setPan({ x: 0, y: 0 }); setNat({ w: 0, h: 0 }) }, [resetKey, url, initialRotation])
  useEffect(() => { if (w && h) onSize?.(w, h) }, [w, h, onSize])
  useEffect(() => {
    const c = cvs.current; if (!c || url) return
    if (!source) { c.width = 0; c.height = 0; return }
    c.width = w; c.height = h
    const ctx = c.getContext('2d'); if (!ctx) return
    if (source instanceof ImageData) ctx.putImageData(source, 0, 0); else ctx.drawImage(source, 0, 0)
  }, [source, url, w, h])
  useEffect(() => { const c = cvs.current; return () => { if (c) { c.width = 0; c.height = 0 } } }, []) // release the backing store
  useEffect(() => {
    const el = box.current; if (!el) return
    const calc = () => setView({ w: el.clientWidth, h: el.clientHeight })
    calc(); const ro = new ResizeObserver(calc); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'))) return
      if (e.key === '+' || e.key === '=') setZ((v) => clamp(v * 1.25))
      else if (e.key === '-') setZ((v) => clamp(v / 1.25))
      else if (e.key === '0') { setZ(1); setPan({ x: 0, y: 0 }) }
      else if (e.key === 'r') setRot((r) => (r + 90) % 360)
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])

  const dist = () => { const [a, b] = [...ptrs.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
  const style = { width: w * fit, height: h * fit, transform: `translate(${pan.x}px,${pan.y}px) rotate(${rot}deg) scale(${z})` }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-2" style={{ borderColor: 'var(--line)' }} role="toolbar" aria-label="Image controls">
        <button className={btn} aria-label="Zoom out" onClick={() => setZ((v) => clamp(v / 1.25))}>−</button>
        <button className={btn} aria-label="Zoom in" onClick={() => setZ((v) => clamp(v * 1.25))}>+</button>
        <button className={btn} onClick={() => { setZ(1); setPan({ x: 0, y: 0 }) }}>Fit</button>
        <button className={btn} onClick={() => { setZ(fill / fit); setPan({ x: 0, y: 0 }) }}>Fill</button>
        <button className={btn} onClick={() => { setZ(1 / fit); setPan({ x: 0, y: 0 }) }}>100%</button>
        <button className={btn} aria-label="Rotate 90 degrees" onClick={() => setRot((r) => (r + 90) % 360)}>Rotate</button>
        {extra}
        <span className="ml-auto text-sm" style={{ color: 'var(--mute)' }}>{Math.round(z * fit * 100)}%</span>
      </div>
      <div ref={box} role="img" aria-label={label} className="checker relative min-h-0 flex-1 touch-none overflow-hidden"
        onWheel={(e) => setZ((v) => clamp(v * (e.deltaY < 0 ? 1.1 : 0.9)))}
        onPointerDown={(e) => {
          ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); e.currentTarget.setPointerCapture(e.pointerId)
          if (ptrs.current.size === 2) { lastDist.current = dist(); drag.current = null } else drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
        }}
        onPointerMove={(e) => {
          if (!ptrs.current.has(e.pointerId)) return
          ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (ptrs.current.size === 2) { const d = dist(); if (lastDist.current) setZ((v) => clamp((v * d) / lastDist.current)); lastDist.current = d }
          else if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })
        }}
        onPointerUp={(e) => {
          ptrs.current.delete(e.pointerId); lastDist.current = 0
          const rest = [...ptrs.current.values()][0]
          drag.current = rest ? { x: rest.x - pan.x, y: rest.y - pan.y } : null
        }}
        onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); lastDist.current = 0; drag.current = null }}>
        {url
          ? <img src={url} alt={label} draggable={false} className="absolute inset-0 m-auto select-none" style={style} data-testid="viewer-image"
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth || 512, h: e.currentTarget.naturalHeight || 512 })} onError={onError} />
          : <canvas ref={cvs} aria-hidden data-testid="raster-canvas" className="absolute inset-0 m-auto select-none" style={{ ...style, display: source ? 'block' : 'none' }} />}
        {overlay && <div className="absolute inset-0 grid place-items-center">{overlay}</div>}
      </div>
    </div>)
}
