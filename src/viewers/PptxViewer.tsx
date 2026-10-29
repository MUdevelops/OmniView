import { useEffect, useRef, useState } from 'react'
import { init } from 'pptx-preview'
import type { ViewerProps } from '../core/registry'

const W = 960; const H = 540
export default function PptxViewer({ file }: ViewerProps) {
  const host = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const [slides, setSlides] = useState<HTMLElement[]>([])
  const [cur, setCur] = useState(0)
  const [scale, setScale] = useState(1)
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' })
  useEffect(() => {
    let dead = false; const el = host.current
    if (!el) return
    setState({ status: 'loading' }); setSlides([]); setCur(0)
    ;(async () => {
      try {
        const buf = await file.arrayBuffer()
        if (dead) return
        const previewer = init(el, { width: W, height: H })
        await previewer.preview(buf)
        if (dead) return
        // pptx-preview renders every slide into one wrapper; we show one at a time. The wrapper is the element holding the most children.
        const wrapper = [...el.querySelectorAll<HTMLElement>('*')].reduce<HTMLElement | null>((best, n) => (!best || n.children.length > best.children.length ? n : best), null)
        const list = wrapper ? ([...wrapper.children] as HTMLElement[]) : []
        if (!list.length) throw new Error('No slides were found in this presentation.')
        setSlides(list); setState({ status: 'ready' })
      } catch (e) { if (!dead) setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not read this presentation.' }) }
    })()
    return () => { dead = true; el.replaceChildren() }
  }, [file])
  useEffect(() => { slides.forEach((s, i) => { s.style.display = i === cur ? '' : 'none'; s.style.margin = '0' }) }, [slides, cur])
  useEffect(() => {
    const el = frame.current; if (!el) return
    const calc = () => setScale(Math.min(1, el.clientWidth / W, el.clientHeight / H))
    calc(); const ro = new ResizeObserver(calc); ro.observe(el); return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return
      if (e.key === 'PageDown') setCur((c) => Math.min(slides.length - 1, c + 1)); if (e.key === 'PageUp') setCur((c) => Math.max(0, c - 1))
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [slides.length])
  const btn = 'rounded border px-3 py-1 text-sm'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b p-2" style={{ borderColor: 'var(--line)' }} role="toolbar" aria-label="Slide navigator">
        <button className={btn} aria-label="Previous slide" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>‹</button>
        <label className="text-sm">Slide <select aria-label="Go to slide" value={cur} onChange={(e) => setCur(+e.target.value)} className="rounded border px-1 py-0.5" style={{ background: 'var(--panel)' }}>
          {slides.map((_, i) => <option key={i} value={i}>{i + 1}</option>)}</select> of <span data-testid="slide-count">{slides.length}</span></label>
        <button className={btn} aria-label="Next slide" disabled={cur >= slides.length - 1} onClick={() => setCur((c) => c + 1)}>›</button>
        <span className="ml-auto text-xs" style={{ color: 'var(--mute)' }}>PageUp / PageDown</span>
      </div>
      <div ref={frame} className="relative min-h-0 flex-1 overflow-hidden" style={{ background: 'var(--bg)' }}>
        <div ref={host} data-testid="pptx-host" className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%,-50%) scale(${scale})`, background: '#fff', color: '#000' }} />
        {state.status === 'loading' && <p role="status" className="absolute left-4 top-4 rounded px-3 py-2" style={{ background: 'var(--panel)' }}>Rendering slides…</p>}
        {state.status === 'error' && <div role="alert" className="m-8 max-w-md rounded p-4" style={{ background: 'var(--panel)' }}><p className="font-bold">This presentation could not be read.</p><p style={{ color: 'var(--mute)' }}>{state.message}</p></div>}
      </div>
    </div>)
}
