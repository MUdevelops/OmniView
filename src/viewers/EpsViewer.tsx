import { useEffect, useState } from 'react'
import type { ViewerProps } from '../core/registry'
import PanZoom from '../components/PanZoom'
import { parseAsciiPreview, parseDosEpsHeader } from '../core/epsPreview'
import ImageViewer from './ImageViewer'
import RasterWorkerViewer from './RasterWorkerViewer'

const MAX_PS_SCAN = 4 * 1024 * 1024
const createTiff = () => new Worker(new URL('../workers/tiff.worker.ts', import.meta.url), { type: 'module' })
type St =
  | { s: 'loading' }
  | { s: 'tiff'; file: File } | { s: 'pixels'; img: ImageData } | { s: 'png'; file: File }
  | { s: 'gs'; phase: 'loading' | 'rendering' } | { s: 'fail'; msg?: string }

/** EPS / PostScript-based .ai: (1) embedded TIFF preview, (2) %%BeginPreview bitmap, (3) Ghostscript WASM if installed. */
export default function EpsViewer({ file, kind, siblings }: ViewerProps) {
  const [st, setSt] = useState<St>({ s: 'loading' })
  useEffect(() => {
    let dead = false; let gs: Worker | undefined; let timer: ReturnType<typeof setTimeout> | undefined
    setSt({ s: 'loading' })
    ;(async () => {
      try {
        const buf = new Uint8Array(await file.arrayBuffer())
        if (dead) return
        const dos = parseDosEpsHeader(buf)
        if (dos && dos.tiffLength > 0 && dos.tiffOffset + dos.tiffLength <= buf.length) {
          return setSt({ s: 'tiff', file: new File([buf.slice(dos.tiffOffset, dos.tiffOffset + dos.tiffLength)], 'preview.tif', { type: 'image/tiff' }) })
        }
        const from = dos ? dos.psOffset : 0; const to = dos ? Math.min(buf.length, dos.psOffset + dos.psLength) : buf.length
        const ascii = parseAsciiPreview(new TextDecoder('latin1').decode(buf.subarray(from, Math.min(to, from + MAX_PS_SCAN))))
        if (ascii) return setSt({ s: 'pixels', img: new ImageData(new Uint8ClampedArray(ascii.rgba), ascii.width, ascii.height) })
        // No embedded preview: try the optional Ghostscript converter.
        setSt({ s: 'gs', phase: 'loading' })
        const base = import.meta.env.BASE_URL
        const probe = await fetch(`${base}gs/gs.wasm`, { method: 'HEAD' }).catch(() => null)
        if (dead) return
        if (!probe || !probe.ok || (probe.headers.get('content-type') ?? '').includes('text/html')) return setSt({ s: 'fail', msg: 'The optional Ghostscript converter is not installed in this build.' })
        gs = new Worker(`${base}gs/runner.js`)
        timer = setTimeout(() => { gs?.terminate(); if (!dead) setSt({ s: 'fail', msg: 'The converter timed out.' }) }, 90_000)
        gs.onmessage = (e: MessageEvent<{ type: string; data?: ArrayBuffer; message?: string }>) => {
          if (dead) return
          if (e.data.type === 'ready') setSt({ s: 'gs', phase: 'rendering' })
          else if (e.data.type === 'png' && e.data.data) { clearTimeout(timer); setSt({ s: 'png', file: new File([e.data.data], 'render.png', { type: 'image/png' }) }) }
          else { clearTimeout(timer); setSt({ s: 'fail', msg: e.data.message }) }
        }
        gs.onerror = () => { if (!dead) { clearTimeout(timer); setSt({ s: 'fail', msg: 'The converter crashed.' }) } }
        const copy = buf.slice().buffer
        gs.postMessage({ buf: copy }, [copy])
      } catch (e) { if (!dead) setSt({ s: 'fail', msg: e instanceof Error ? e.message : undefined }) }
    })()
    return () => { dead = true; clearTimeout(timer); gs?.terminate() }
  }, [file])

  const banner = (t: string) => <p className="border-b px-3 py-1 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--mute)' }} data-testid="eps-notice">{t}</p>
  const wrap = (note: string, body: JSX.Element) => <div className="flex h-full min-h-0 flex-col">{banner(note)}<div className="min-h-0 flex-1">{body}</div></div>
  switch (st.s) {
    case 'loading': return <p role="status" className="m-8">Reading {kind === 'ai' ? 'Illustrator' : 'EPS'} file…</p>
    case 'gs': return <p role="status" className="m-8" data-testid="eps-converter">{st.phase === 'loading' ? 'Loading converter (several MB)…' : 'Rendering with Ghostscript…'}</p>
    case 'tiff': return wrap('Showing the TIFF preview embedded in this EPS. It is a low-resolution bitmap, not the vector artwork.',
      <RasterWorkerViewer file={st.file} create={createTiff} noun="Page" failHint="The embedded TIFF preview could not be decoded." dimsFile={file} />)
    case 'pixels': return wrap('Showing the bitmap preview embedded in this EPS (%%BeginPreview). It is not the vector artwork.',
      <PanZoom source={st.img} label={file.name} resetKey={file.name + file.size} />)
    case 'png': return wrap('Rendered with Ghostscript (WebAssembly) in your browser.', <ImageViewer file={st.file} kind="png" siblings={siblings} dimsFile={file} />)
    default: return (
      <div role="alert" className="m-8 max-w-md"><p className="font-bold">{kind === 'ai' ? 'This Illustrator file can\u2019t be shown.' : 'This EPS file can\u2019t be shown.'}</p>
        <p style={{ color: 'var(--mute)' }}>{kind === 'ai'
          ? 'It has no PDF stream (it was saved without \u201cCreate PDF Compatible File\u201d, or in an old pre-CS format), so there is nothing a browser can draw.'
          : 'It has no embedded preview image, and the Ghostscript converter was unavailable or failed.'}{st.msg ? ` (${st.msg})` : ''}</p></div>)
  }
}
