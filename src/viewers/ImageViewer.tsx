import { useCallback, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import type { ViewerProps } from '../core/registry'
import PanZoom from '../components/PanZoom'
import { useStore } from '../core/store'
const MIME: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml' }
type Props = ViewerProps & { initialRotation?: number; dimsFile?: File }

export default function ImageViewer({ file, kind, initialRotation, dimsFile }: Props) {
  const [url, setUrl] = useState<string>()
  const [src, setSrc] = useState('')
  const [showSrc, setShowSrc] = useState(false)
  const [failed, setFailed] = useState(false)
  const setDims = useStore((s) => s.setDims)
  useEffect(() => {
    let dead = false; let u: string | undefined
    setShowSrc(false); setFailed(false); setUrl(undefined)
    ;(async () => {
      let blob: Blob = file.slice(0, file.size, MIME[kind] ?? file.type)
      if (kind === 'svg') {
        // Sanitised, then rendered through <img> from a Blob so scripts can never run.
        const clean = DOMPurify.sanitize(await file.text(), { USE_PROFILES: { svg: true, svgFilters: true } })
        if (dead) return
        setSrc(clean); blob = new Blob([clean], { type: MIME.svg })
      }
      if (dead) return
      u = URL.createObjectURL(blob); setUrl(u)
    })().catch(() => { if (!dead) setFailed(true) })
    return () => { dead = true; if (u) URL.revokeObjectURL(u) }
  }, [file, kind])
  const onSize = useCallback((w: number, h: number) => setDims(dimsFile ?? file, w, h), [setDims, dimsFile, file])
  const onError = useCallback(() => setFailed(true), [])
  const extra = kind === 'svg' && <button className="rounded border px-3 py-1 text-sm" aria-pressed={showSrc} onClick={() => setShowSrc((s) => !s)}>View source</button>
  if (failed) return <div role="alert" className="m-8 max-w-md"><p className="font-bold">This image could not be displayed.</p>
    <p style={{ color: 'var(--mute)' }}>The file may be corrupt or truncated, or its contents may not match its extension.</p></div>
  return showSrc
    ? <div className="flex h-full flex-col"><div className="border-b p-2" style={{ borderColor: 'var(--line)' }}>{extra}</div><pre className="flex-1 overflow-auto p-4 text-xs" data-testid="svg-source">{src}</pre></div>
    : <PanZoom url={url} label={file.name} resetKey={`${file.name}:${file.size}:${file.lastModified}`} extra={extra} initialRotation={initialRotation} onSize={onSize} onError={onError} />
}
