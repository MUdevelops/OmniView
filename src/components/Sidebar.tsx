import { useEffect, useRef, useState } from 'react'
import type { Item } from '../core/store'
import type { FileKind } from '../core/fileSniffer'

const THUMB_KINDS = new Set<FileKind>(['jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'])
const MAX_THUMB_BYTES = 25 * 1024 * 1024
const SIDECAR = new Set<FileKind>(['mtl', 'bin'])

/** Thumbnails are created lazily (only when scrolled into view) and revoked on unmount. Decoded formats show a type badge instead. */
function Thumb({ item }: { item: Item }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [url, setUrl] = useState<string>()
  const ok = THUMB_KINDS.has(item.kind) && item.file.size <= MAX_THUMB_BYTES
  useEffect(() => {
    const el = ref.current; if (!ok || !el) return
    let u: string | undefined
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { u = URL.createObjectURL(item.file.slice(0, item.file.size, item.kind === 'svg' ? 'image/svg+xml' : item.file.type)); setUrl(u); io.disconnect() }
    })
    io.observe(el)
    return () => { io.disconnect(); if (u) URL.revokeObjectURL(u) }
  }, [item, ok])
  return (
    <span ref={ref} aria-hidden className="checker grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded border text-[10px] font-bold" style={{ borderColor: 'var(--line)' }}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" decoding="async" /> : <span style={{ color: 'var(--mute)', background: 'var(--panel)' }} className="grid h-full w-full place-items-center">{item.kind.toUpperCase().slice(0, 4)}</span>}
    </span>)
}

export default function Sidebar({ items, index, onPick }: { items: Item[]; index: number; onPick: (i: number) => void }) {
  return (
    <nav aria-label="Files" className="w-40 shrink-0 overflow-auto border-r sm:w-60" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <ul>{items.map((it, i) => (
        <li key={it.id}>
          <button onClick={() => onPick(i)} aria-current={i === index ? 'true' : undefined} title={it.file.name}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm" style={{ ...(i === index ? { background: 'var(--bg)', fontWeight: 700 } : null), opacity: SIDECAR.has(it.kind) ? 0.6 : 1 }}>
            <Thumb item={it} /><span className="min-w-0 flex-1 truncate">{it.file.name}{SIDECAR.has(it.kind) && <span className="block text-xs font-normal" style={{ color: 'var(--mute)' }}>sidecar</span>}</span>
          </button>
        </li>))}</ul>
    </nav>)
}
