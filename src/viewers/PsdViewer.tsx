import { useEffect, useMemo, useState } from 'react'
import { readPsd, type Layer, type Psd } from 'ag-psd'
import type { ViewerProps } from '../core/registry'
import PanZoom from '../components/PanZoom'
import { flattenLayers } from '../core/psdLayers'
import { useStore } from '../core/store'

// Approximate re-composite used once the user toggles layers: ignores blend modes, masks and effects.
function paint(ctx: CanvasRenderingContext2D, list: Layer[] | undefined, hidden: Set<string>, alpha: number, prefix: string) {
  list?.forEach((l, i) => {
    const id = prefix + i
    if (hidden.has(id)) return
    const a = alpha * (l.opacity ?? 1)
    if (l.children) paint(ctx, l.children, hidden, a, id + '.')
    else if (l.canvas) { ctx.globalAlpha = a; ctx.drawImage(l.canvas, l.left ?? 0, l.top ?? 0); ctx.globalAlpha = 1 }
  })
}
function release(list: Layer[] | undefined) { list?.forEach((l) => { if (l.canvas) l.canvas.width = 0; release(l.children) }) }

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; psd: Psd }
export default function PsdViewer({ file }: ViewerProps) {
  const [st, setSt] = useState<State>({ status: 'loading' })
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [touched, setTouched] = useState(false)
  const [composite, setComposite] = useState<HTMLCanvasElement | null>(null)
  const [showLayers, setShowLayers] = useState(true)
  const setDims = useStore((s) => s.setDims)

  useEffect(() => {
    let dead = false; let psd: Psd | undefined
    setSt({ status: 'loading' }); setTouched(false); setComposite(null)
    ;(async () => {
      try {
        const buf = await file.arrayBuffer()
        await new Promise((r) => setTimeout(r, 0)) // let the loading state paint; the parse itself cannot be interrupted
        if (dead) return
        psd = readPsd(buf, { skipThumbnail: true })
        if (dead) { release(psd.children); return }
        setHidden(new Set(flattenLayers(psd.children).filter((r) => r.hidden).map((r) => r.id)))
        setSt({ status: 'ready', psd })
      } catch (e) {
        if (!dead) setSt({ status: 'error', message: e instanceof Error ? e.message : 'Could not read this PSD file.' })
      }
    })()
    return () => { dead = true; if (psd) { release(psd.children); if (psd.canvas) psd.canvas.width = 0 } }
  }, [file])

  const psd = st.status === 'ready' ? st.psd : null
  const needCompose = touched || (psd !== null && !psd.canvas)
  const rows = useMemo(() => flattenLayers(psd?.children), [psd])
  useEffect(() => { if (psd) setDims(file, psd.width, psd.height) }, [file, psd, setDims])
  useEffect(() => {
    if (!psd || !needCompose) return
    const c = document.createElement('canvas'); c.width = psd.width; c.height = psd.height
    const ctx = c.getContext('2d'); if (!ctx) return
    paint(ctx, psd.children, hidden, 1, ''); setComposite(c)
    return () => { c.width = 0 }
  }, [psd, needCompose, hidden])

  const toggle = (id: string) => { setTouched(true); setHidden((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  const source = needCompose ? composite : psd?.canvas ?? null
  const overlay = st.status === 'error'
    ? <div role="alert" className="m-4 max-w-md rounded border p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <p className="font-bold">This PSD could not be read.</p><p style={{ color: 'var(--mute)' }}>{st.message}</p></div>
    : st.status === 'loading' ? <p role="status" className="rounded px-3 py-2" style={{ background: 'var(--panel)' }}>Reading PSD…</p> : null
  const extra = psd && <button className="rounded border px-3 py-1 text-sm" aria-pressed={showLayers} onClick={() => setShowLayers((s) => !s)}>Layers ({rows.length})</button>
  return (
    <div className="flex h-full min-h-0 flex-col sm:flex-row">
      <div className="min-h-0 min-w-0 flex-1"><PanZoom source={source} label={file.name} resetKey={`${file.name}:${file.size}:${file.lastModified}`} extra={extra} overlay={overlay} /></div>
      {psd && showLayers && (
        <aside aria-label="Layers" className="max-h-44 w-full shrink-0 overflow-auto border-t p-2 text-sm sm:max-h-none sm:w-60 sm:border-l sm:border-t-0" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
          {!psd.canvas && <p className="mb-2" style={{ color: 'var(--mute)' }}>No embedded composite; drawn from layers (approximate).</p>}
          {touched && <p className="mb-2" style={{ color: 'var(--mute)' }}>Approximate: blend modes, masks and effects are ignored.</p>}
          {rows.length === 0 && <p style={{ color: 'var(--mute)' }}>This file has no layers.</p>}
          <ul>{rows.map((r) => (
            <li key={r.id} style={{ paddingLeft: r.depth * 12 }}>
              <label className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={!hidden.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Show layer ${r.name}`} />
                <span className={r.isGroup ? 'font-bold' : ''}>{r.name}</span></label></li>))}</ul>
        </aside>)}
    </div>)
}
