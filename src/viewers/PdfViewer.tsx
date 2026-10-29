import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import 'pdfjs-dist/web/pdf_viewer.css'
import type { ViewerProps } from '../core/registry'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

function Thumb({ doc, n, active, onPick }: { doc: PDFDocumentProxy; n: number; active: boolean; onPick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!; let dead = false; let task: pdfjs.RenderTask | undefined
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const p = await doc.getPage(n); if (dead) return
      const vp = p.getViewport({ scale: 100 / p.getViewport({ scale: 1 }).width })
      c.width = vp.width; c.height = vp.height
      task = p.render({ canvasContext: c.getContext('2d')!, viewport: vp })
      await task.promise.catch(() => undefined)
    })
    io.observe(c)
    return () => { dead = true; io.disconnect(); task?.cancel() }
  }, [doc, n])
  return <button onClick={onPick} aria-label={`Go to page ${n}`} aria-current={active} className="block w-full p-1 text-center">
    <canvas ref={ref} className="mx-auto" style={{ outline: active ? '2px solid var(--accent)' : '1px solid var(--line)' }} />
    <span className="text-xs">{n}</span></button>
}

export default function PdfViewer({ file }: ViewerProps) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1); const [zoom, setZoom] = useState(1.2)
  const [err, setErr] = useState('')
  const [pw, setPw] = useState<{ send: (p: string) => void; wrong: boolean } | null>(null)
  const [pwText, setPwText] = useState('')
  const [q, setQ] = useState(''); const [hits, setHits] = useState<number[]>([]); const [busy, setBusy] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null); const textEl = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    let dead = false; let task: pdfjs.PDFDocumentLoadingTask | undefined
    setDoc(null); setPage(1); setErr(''); setPw(null); setHits([]); setQ('')
    ;(async () => {
      try {
        task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false })
        task.onPassword = (send: (p: string) => void, reason: number) => setPw({ send, wrong: reason === 2 })
        const d = await task.promise
        if (dead) return
        setPw(null); setDoc(d)
      } catch (e) { if (!dead) setErr(e instanceof Error ? e.message : 'Unreadable PDF') }
    })()
    return () => { dead = true; void task?.destroy() }
  }, [file])

  useEffect(() => {
    if (!doc) return
    let dead = false; let rt: pdfjs.RenderTask | undefined; let tl: pdfjs.TextLayer | undefined
    ;(async () => {
      const p = await doc.getPage(page); if (dead) return
      const vp = p.getViewport({ scale: zoom }); const dpr = window.devicePixelRatio || 1
      const c = canvas.current!; const t = textEl.current!
      c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr)
      c.style.width = `${vp.width}px`; c.style.height = `${vp.height}px`
      setDims({ w: vp.width, h: vp.height })
      rt = p.render({ canvasContext: c.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
      t.replaceChildren()
      tl = new pdfjs.TextLayer({ textContentSource: p.streamTextContent(), container: t, viewport: vp })
      await Promise.all([rt.promise, tl.render()]).catch(() => undefined)
    })()
    return () => { dead = true; rt?.cancel(); tl?.cancel() }
  }, [doc, page, zoom])

  const search = async () => {
    if (!doc || !q.trim()) return
    setBusy(true); const needle = q.toLowerCase(); const found: number[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent()
      if (tc.items.map((it) => ('str' in it ? it.str : '')).join(' ').toLowerCase().includes(needle)) found.push(i)
    }
    setHits(found); setBusy(false); if (found[0]) setPage(found[0])
  }
  const go = (n: number) => doc && setPage(Math.max(1, Math.min(n, doc.numPages)))
  const nextHit = (d: number) => { if (hits.length) { const i = hits.indexOf(page); setPage(hits[(i + d + hits.length) % hits.length] ?? hits[0]) } }

  if (err) return <p role="alert" className="m-8">Could not open this PDF: {err}</p>
  if (pw) return (
    <form className="m-8 flex max-w-sm flex-col gap-2" onSubmit={(e) => { e.preventDefault(); pw.send(pwText) }}>
      <label htmlFor="pdf-pw" className="font-bold">This PDF is password protected</label>
      {pw.wrong && <p role="alert">That password was not correct.</p>}
      <input id="pdf-pw" type="password" autoFocus value={pwText} onChange={(e) => setPwText(e.target.value)} className="rounded border p-2" style={{ background: 'var(--panel)' }} />
      <button className="rounded border px-3 py-1">Unlock</button></form>)
  if (!doc) return <p className="m-8">Opening PDF…</p>
  const btn = 'rounded border px-3 py-1 text-sm'
  return (
    <div className="flex h-full">
      <div className="w-28 shrink-0 overflow-auto border-r" style={{ borderColor: 'var(--line)' }} aria-label="Page thumbnails">
        {Array.from({ length: doc.numPages }, (_, i) => <Thumb key={i} doc={doc} n={i + 1} active={page === i + 1} onPick={() => setPage(i + 1)} />)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b p-2" style={{ borderColor: 'var(--line)' }} role="toolbar" aria-label="PDF controls">
          <button className={btn} aria-label="Previous page" onClick={() => go(page - 1)}>‹</button>
          <span className="text-sm" data-testid="pdf-page-count">Page {page} of {doc.numPages}</span>
          <button className={btn} aria-label="Next page" onClick={() => go(page + 1)}>›</button>
          <button className={btn} aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}>−</button>
          <button className={btn} aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(5, z * 1.2))}>+</button>
          <form className="ml-auto flex gap-1" onSubmit={(e) => { e.preventDefault(); void search() }}>
            <input aria-label="Search text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text" className="rounded border px-2 py-1 text-sm" style={{ background: 'var(--panel)' }} />
            <button className={btn} disabled={busy}>{busy ? 'Searching…' : 'Find'}</button>
            {hits.length > 0 && <><button type="button" className={btn} aria-label="Previous match" onClick={() => nextHit(-1)}>↑</button><button type="button" className={btn} aria-label="Next match" onClick={() => nextHit(1)}>↓</button></>}
          </form>
          {!busy && q && hits.length === 0 && <span className="text-sm" style={{ color: 'var(--mute)' }}>No matches</span>}
          {hits.length > 0 && <span className="text-sm" style={{ color: 'var(--mute)' }}>Found on {hits.length} page{hits.length > 1 ? 's' : ''}</span>}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="relative mx-auto bg-white" style={{ width: dims.w, height: dims.h, ['--scale-factor' as string]: zoom }}>
            <canvas ref={canvas} />
            <div ref={textEl} className="textLayer" />
          </div>
        </div>
      </div>
    </div>)
}
