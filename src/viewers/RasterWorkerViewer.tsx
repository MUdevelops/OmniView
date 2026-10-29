import { useEffect } from 'react'
import PanZoom from '../components/PanZoom'
import { useStore } from '../core/store'
import { useRasterWorker } from './useRasterWorker'

interface Props { file: File; create: () => Worker; noun: string; failHint: string; dimsFile?: File }
export default function RasterWorkerViewer({ file, create, noun, failHint, dimsFile }: Props) {
  const r = useRasterWorker(file, create)
  const setDims = useStore((s) => s.setDims)
  const info = r.pages[r.page]
  useEffect(() => { if (info) setDims(dimsFile ?? file, info.width, info.height) }, [file, dimsFile, info, setDims])
  const btn = 'rounded border px-3 py-1 text-sm'
  const extra = r.pages.length > 1 && (
    <div className="flex items-center gap-1" role="group" aria-label={`${noun} navigation`}>
      <button className={btn} aria-label={`Previous ${noun.toLowerCase()}`} disabled={r.page === 0} onClick={() => r.setPage(r.page - 1)}>‹</button>
      <span className="px-1 text-sm" aria-live="polite">{noun} {r.page + 1} / {r.pages.length}</span>
      <button className={btn} aria-label={`Next ${noun.toLowerCase()}`} disabled={r.page >= r.pages.length - 1} onClick={() => r.setPage(r.page + 1)}>›</button>
    </div>)
  const overlay = r.status === 'error'
    ? <div role="alert" className="m-4 max-w-md rounded border p-4" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <p className="font-bold">{failHint}</p><p style={{ color: 'var(--mute)' }}>{r.error}</p></div>
    : r.status === 'loading' ? <p role="status" className="rounded px-3 py-2" style={{ background: 'var(--panel)' }}>Decoding…</p> : null
  return <PanZoom source={r.image} label={file.name} resetKey={`${file.name}:${file.size}:${file.lastModified}:${r.page}`} extra={extra} overlay={overlay} />
}
