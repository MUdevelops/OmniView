import { lazy, Suspense, useEffect, useState } from 'react'
import type { ViewerProps } from '../core/registry'
const PdfViewer = lazy(() => import('./PdfViewer'))
const CONVERT_URL = (import.meta.env.VITE_CONVERSION_URL as string | undefined)?.replace(/\/$/, '')

/** Legacy binary .doc/.ppt cannot be rendered reliably in a browser. An optional, self-hosted converter can be enabled (see /server). */
export default function LegacyViewer({ file, kind }: ViewerProps) {
  const [state, setState] = useState<{ s: 'idle' | 'busy' | 'error' | 'done'; msg?: string; pdf?: File }>({ s: 'idle' })
  useEffect(() => { setState({ s: 'idle' }) }, [file])
  useEffect(() => {
    if (state.s !== 'busy') return
    const ctl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`${CONVERT_URL}/convert?filename=${encodeURIComponent(file.name)}`, { method: 'POST', body: file, signal: ctl.signal })
        if (!res.ok) throw new Error((await res.text().catch(() => '')) || `Server returned ${res.status}`)
        setState({ s: 'done', pdf: new File([await res.blob()], file.name.replace(/\.[^.]+$/, '') + '.pdf', { type: 'application/pdf' }) })
      } catch (e) { if (!ctl.signal.aborted) setState({ s: 'error', msg: e instanceof Error ? e.message : 'Conversion failed.' }) }
    })()
    return () => ctl.abort() // switching files cancels the upload
  }, [state.s, file])
  if (state.s === 'done' && state.pdf) return <Suspense fallback={<p className="m-8">Loading viewer…</p>}><PdfViewer file={state.pdf} kind="pdf" siblings={[]} /></Suspense>
  return (
    <div className="m-8 max-w-lg" role="status">
      <p className="font-bold">{file.name} is a legacy binary Office file.</p>
      <p style={{ color: 'var(--mute)' }}>Old {kind === 'legacy' && /\.ppt$/i.test(file.name) ? '.ppt' : '.doc'} files can't be rendered reliably inside a browser. Open it in Word, PowerPoint or LibreOffice, or save it as .docx/.pptx/.pdf and open that here.</p>
      {CONVERT_URL ? (
        <div className="mt-4 rounded border p-3" style={{ borderColor: 'var(--line)' }}>
          <p className="text-sm"><strong>Optional server conversion.</strong> This is the one case where a file leaves your browser: it is uploaded to <code>{CONVERT_URL}</code>, converted to PDF there and shown here.</p>
          <button className="mt-2 rounded border px-3 py-1 text-sm" disabled={state.s === 'busy'} onClick={() => setState({ s: 'busy' })}>{state.s === 'busy' ? 'Converting…' : 'Convert on server'}</button>
          {state.s === 'error' && <p role="alert" className="mt-2 text-sm">Conversion failed: {state.msg}</p>}
        </div>) : <p className="mt-3 text-sm" style={{ color: 'var(--mute)' }}>Server-side conversion is not enabled for this deployment.</p>}
    </div>)
}
