import { useEffect, useState } from 'react'
import exifr from 'exifr'
import type { FileKind } from '../core/fileSniffer'
import { formatBytes, toRows } from '../core/format'
import { useStore } from '../core/store'

const EXIF_KINDS = new Set<FileKind>(['jpeg', 'tiff', 'heic', 'avif', 'png', 'raw'])
const NATIVE = new Set<FileKind>(['jpeg', 'png', 'gif', 'webp', 'avif', 'bmp'])

export default function MetadataPanel({ file, kind, onClose }: { file: File; kind: FileKind; onClose: () => void }) {
  const dims = useStore((s) => s.dims)
  const [tags, setTags] = useState<[string, string][] | null>(null)
  const [native, setNative] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    let dead = false
    setTags(null); setNative(null)
    if (EXIF_KINDS.has(kind)) {
      exifr.parse(file, { tiff: true, xmp: true, iptc: true, gps: true, exif: true, ifd0: true, mergeOutput: true })
        .then((r: Record<string, unknown> | undefined) => { if (!dead) setTags(toRows(r)) })
        .catch(() => { if (!dead) setTags([]) })
    } else setTags([])
    if (NATIVE.has(kind)) {
      createImageBitmap(file).then((b) => { if (!dead) setNative({ w: b.width, h: b.height }); b.close() }).catch(() => undefined)
    }
    return () => { dead = true }
  }, [file, kind])
  const d = dims && dims.file === file ? dims : native && { w: native.w, h: native.h }
  const basics: [string, string][] = [
    ['File name', file.name], ['Size', formatBytes(file.size)], ['Detected type', kind],
    ['MIME type (browser)', file.type || '—'], ['Dimensions', d ? `${d.w} × ${d.h}` : '—'],
    ['Last modified', file.lastModified ? new Date(file.lastModified).toLocaleString() : '—'],
  ]
  const row = ([k, v]: [string, string]) => (<div key={k} className="grid grid-cols-[8rem_1fr] gap-2 py-1"><dt style={{ color: 'var(--mute)' }}>{k}</dt><dd className="break-words">{v}</dd></div>)
  return (
    <aside aria-label="File information" className="fixed inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l sm:static sm:z-auto sm:w-80 sm:max-w-none sm:shrink-0"
      style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: 'var(--line)' }}>
        <h2 className="font-bold">Info</h2>
        <button className="rounded border px-2 py-0.5 text-sm" aria-label="Close info panel" onClick={onClose}>✕</button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 py-2 text-sm">
        <dl>{basics.map(row)}</dl>
        <h3 className="mb-1 mt-4 font-bold">EXIF / IPTC / XMP</h3>
        {tags === null ? <p role="status" style={{ color: 'var(--mute)' }}>Reading metadata…</p>
          : tags.length === 0 ? <p style={{ color: 'var(--mute)' }}>{EXIF_KINDS.has(kind) ? 'No embedded metadata found.' : 'Not available for this format.'}</p>
          : <dl>{tags.map(row)}</dl>}
      </div>
    </aside>)
}
