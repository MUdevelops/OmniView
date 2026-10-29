import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import type { ViewerProps } from '../core/registry'

export default function DocxViewer({ file }: ViewerProps) {
  const host = useRef<HTMLDivElement>(null)
  const styles = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; message?: string }>({ status: 'loading' })
  useEffect(() => {
    let dead = false
    const el = host.current; const st = styles.current
    if (!el || !st) return
    setState({ status: 'loading' })
    ;(async () => {
      try {
        const buf = await file.arrayBuffer()
        if (dead) return
        await renderAsync(buf, el, st, { className: 'docx', inWrapper: true, breakPages: true, useBase64URL: true, ignoreLastRenderedPageBreak: true }) // base64 → no Blob URLs to leak, CSP-friendly
        if (dead) return
        el.querySelectorAll('a').forEach((a) => { // links: http(s)/mailto only, always a new tab with no opener
          const href = a.getAttribute('href') ?? ''
          if (/^(https?:|mailto:)/i.test(href)) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer') } else a.removeAttribute('href')
        })
        setState({ status: 'ready' })
      } catch (e) {
        if (!dead) setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not read this document.' })
      }
    })()
    return () => { dead = true; el.replaceChildren(); st.replaceChildren() }
  }, [file])
  return (
    <div className="relative h-full overflow-auto" style={{ background: 'var(--bg)' }}>
      <div ref={styles} />
      <div ref={host} data-testid="docx-host" className="docx-host" style={{ color: '#000' }} />
      {state.status === 'loading' && <p role="status" className="absolute left-4 top-4 rounded px-3 py-2" style={{ background: 'var(--panel)' }}>Rendering document…</p>}
      {state.status === 'error' && <div role="alert" className="m-8 max-w-md"><p className="font-bold">This Word document could not be read.</p><p style={{ color: 'var(--mute)' }}>{state.message}</p></div>}
    </div>)
}
