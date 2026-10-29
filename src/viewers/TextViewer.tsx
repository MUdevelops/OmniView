import { useEffect, useState } from 'react'
import { strFromU8, unzipSync } from 'fflate'
import type { ViewerProps } from '../core/registry'
import { rtfToText } from '../core/rtf'

const MAX_CHARS = 2_000_000
const NS_TEXT = 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
const NS_DRAW = 'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0'
type Block = { t: 'h' | 'p' | 'slide'; text: string }

function inline(n: Node): string {
  if (n.nodeType === 3) return n.nodeValue ?? ''
  if (!(n instanceof Element)) return ''
  if (n.namespaceURI === NS_TEXT) {
    if (n.localName === 'tab') return '\t'
    if (n.localName === 'line-break') return '\n'
    if (n.localName === 's') return ' '.repeat(Number(n.getAttributeNS(NS_TEXT, 'c')) || 1)
  }
  return [...n.childNodes].map(inline).join('')
}
/** Best-effort ODF text: headings, paragraphs and slide boundaries, in document order. */
export function odfBlocks(xml: string): Block[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('content.xml is not valid XML')
  const out: Block[] = []
  const walk = (n: Element) => {
    if (n.namespaceURI === NS_DRAW && n.localName === 'page') out.push({ t: 'slide', text: n.getAttributeNS('urn:oasis:names:tc:opendocument:xmlns:drawing:1.0', 'name') || '' })
    if (n.namespaceURI === NS_TEXT && (n.localName === 'h' || n.localName === 'p')) { const text = inline(n).trim(); if (text) out.push({ t: n.localName === 'h' ? 'h' : 'p', text }); return }
    for (const c of n.children) walk(c)
  }
  walk(doc.documentElement)
  return out
}

export default function TextViewer({ file, kind }: ViewerProps) {
  const [content, setContent] = useState<{ blocks?: Block[]; text?: string; note?: string } | null>(null)
  const [err, setErr] = useState<string>()
  const [wrap, setWrap] = useState(true)
  useEffect(() => {
    let dead = false
    setContent(null); setErr(undefined)
    ;(async () => {
      try {
        if (kind === 'odt' || kind === 'odp') {
          const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (f) => f.name === 'content.xml' })
          if (!files['content.xml']) throw new Error('This OpenDocument file has no content.xml.')
          if (!dead) setContent({ blocks: odfBlocks(strFromU8(files['content.xml'])), note: 'Text only: layout, images and styles are not shown.' })
        } else {
          const raw = await file.slice(0, MAX_CHARS).text()
          const truncated = file.size > MAX_CHARS
          const text = kind === 'rtf' ? rtfToText(raw) : raw
          if (!dead) setContent({ text, note: [kind === 'rtf' ? 'Text only: formatting is not shown.' : kind === 'text' && /\.(md|markdown)$/i.test(file.name) ? 'Shown as plain Markdown source.' : '', truncated ? 'Only the first 2 MB are shown.' : ''].filter(Boolean).join(' ') })
        }
      } catch (e) { if (!dead) setErr(e instanceof Error ? e.message : 'Could not read this file.') }
    })()
    return () => { dead = true }
  }, [file, kind])
  if (err) return <div role="alert" className="m-8 max-w-md"><p className="font-bold">This file could not be read.</p><p style={{ color: 'var(--mute)' }}>{err}</p></div>
  if (!content) return <p role="status" className="m-8">Reading…</p>
  let slide = 0
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b p-2 text-sm" style={{ borderColor: 'var(--line)' }}>
        <button className="rounded border px-3 py-1" aria-pressed={wrap} onClick={() => setWrap((w) => !w)}>Wrap lines</button>
        {content.note && <span style={{ color: 'var(--mute)' }}>{content.note}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4" data-testid="text-view">
        {content.text !== undefined
          ? <pre className="text-sm" style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', wordBreak: 'break-word', fontFamily: 'ui-monospace, monospace' }}>{content.text}</pre>
          : <article className="max-w-3xl space-y-2">{content.blocks!.map((b, i) => b.t === 'slide'
              ? <h3 key={i} className="mt-6 border-t pt-2 font-bold" style={{ borderColor: 'var(--line)' }}>Slide {++slide}</h3>
              : b.t === 'h' ? <h2 key={i} className="text-lg font-bold">{b.text}</h2> : <p key={i} style={{ whiteSpace: 'pre-wrap' }}>{b.text}</p>)}
              {content.blocks!.length === 0 && <p style={{ color: 'var(--mute)' }}>No text found.</p>}</article>}
      </div>
    </div>)
}
