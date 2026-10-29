import { useEffect, useState } from 'react'
import exifr from 'exifr'
import type { ViewerProps } from '../core/registry'
import { useStore } from '../core/store'
import ImageViewer from './ImageViewer'

const ROT: Record<number, number> = { 3: 180, 6: 90, 8: 270 }
type State = { s: 'loading' } | { s: 'none' } | { s: 'error'; msg: string } | { s: 'ready'; preview: File; rot: number; w: number; h: number }

/** RAW files are not decoded. We pull out the largest JPEG preview the camera embedded and show that. */
export default function RawViewer({ file, siblings }: ViewerProps) {
  const [st, setSt] = useState<State>({ s: 'loading' })
  const setDims = useStore((s) => s.setDims)
  useEffect(() => {
    let dead = false
    setSt({ s: 'loading' })
    const w = new Worker(new URL('../workers/raw.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = async (e: MessageEvent<{ type: string; data?: ArrayBuffer; message?: string }>) => {
      if (dead) return
      const m = e.data
      if (m.type === 'none') return setSt({ s: 'none' })
      if (m.type === 'error' || !m.data) return setSt({ s: 'error', msg: m.message ?? 'Scan failed' })
      const preview = new File([m.data], file.name + '.preview.jpg', { type: 'image/jpeg' })
      try {
        const bmp = await createImageBitmap(preview) // also proves the bytes really decode
        const dims = { w: bmp.width, h: bmp.height }; bmp.close()
        const o = await exifr.orientation(file).catch(() => undefined)
        if (dead) return
        setDims(file, dims.w, dims.h)
        setSt({ s: 'ready', preview, rot: (o && ROT[o]) || 0, ...dims })
      } catch { if (!dead) setSt({ s: 'none' }) }
    }
    w.onerror = () => { if (!dead) setSt({ s: 'error', msg: 'The RAW scanner crashed.' }) }
    file.arrayBuffer().then((buf) => { if (!dead) w.postMessage({ buf }, [buf]) }).catch(() => { if (!dead) setSt({ s: 'error', msg: 'Could not read the file.' }) })
    return () => { dead = true; w.terminate() }
  }, [file, setDims])
  if (st.s === 'loading') return <p role="status" className="m-8">Looking for the embedded preview…</p>
  if (st.s !== 'ready') return (
    <div role="alert" className="m-8 max-w-md"><p className="font-bold">Cannot render this RAW file.</p>
      <p style={{ color: 'var(--mute)' }}>{st.s === 'none' ? 'No usable embedded JPEG preview was found, and OmniView does not decode raw sensor data.' : st.msg}</p></div>)
  const low = Math.max(st.w, st.h) < 1000
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="border-b px-3 py-1 text-sm" style={{ borderColor: 'var(--line)', color: 'var(--mute)' }} data-testid="raw-notice">
        Embedded JPEG preview ({st.w} × {st.h}), not a full RAW decode.{low ? ' This preview is low resolution.' : ''}</p>
      <div className="min-h-0 flex-1"><ImageViewer file={st.preview} kind="jpeg" siblings={siblings} initialRotation={st.rot} dimsFile={file} /></div>
    </div>)
}
