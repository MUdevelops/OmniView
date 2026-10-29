import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from './core/store'
import { viewerFor } from './core/registry'
import ErrorBoundary from './components/ErrorBoundary'
import Dropzone from './components/Dropzone'
import MetadataPanel from './components/MetadataPanel'
import Sidebar from './components/Sidebar'
import Toolbar from './components/Toolbar'
import HelpOverlay from './components/HelpOverlay'

const typing = (t: EventTarget | null) => { const e = t as HTMLElement | null; return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable) }

export default function App() {
  const { items, index, dark, go, step, toggleDark, add, maxBytes } = useStore()
  const cur = items[index]
  const [info, setInfo] = useState(false); const [help, setHelp] = useState(false)
  const [playing, setPlaying] = useState(false); const [full, setFull] = useState(false)
  const [allowed, setAllowed] = useState<Set<string>>(new Set()) // files the user chose to open despite the size warning
  const main = useRef<HTMLElement>(null)
  const files = useMemo(() => items.map((i) => i.file), [items])
  const fullscreen = useCallback(() => { if (document.fullscreenElement) void document.exitFullscreen(); else void main.current?.requestFullscreen?.() }, [])

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f) }, [])
  useEffect(() => {
    if (!playing || items.length < 2) return
    const t = setInterval(() => step(1), 3000)
    return () => clearInterval(t)
  }, [playing, items.length, step])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'i') setInfo((v) => !v)
      else if (e.key === 'f') fullscreen()
      else if (e.key === 's') setPlaying((v) => !v)
      else if (e.key === '?' || e.key === 'h') setHelp(true)
    }
    const p = (e: ClipboardEvent) => { const f = [...(e.clipboardData?.files ?? [])]; if (f.length) { e.preventDefault(); void add(f) } }
    addEventListener('keydown', k); addEventListener('paste', p)
    return () => { removeEventListener('keydown', k); removeEventListener('paste', p) }
  }, [step, add, fullscreen])

  const Viewer = cur ? viewerFor(cur.kind) : null
  const tooBig = !!cur && cur.file.size > maxBytes && !allowed.has(cur.id)
  const pick = (id: string) => (document.querySelector(`[data-testid="${id}"]`) as HTMLInputElement | null)?.click()
  const closeHelp = useCallback(() => setHelp(false), [])
  return (
    <Dropzone>
      <div className="flex flex-col" style={{ height: '100dvh' }}>
        <Toolbar hasFile={!!cur} info={info} dark={dark} playing={playing} fullscreen={full}
          onOpenFiles={() => pick('file-input')} onOpenFolder={() => pick('folder-input')} onInfo={() => setInfo((v) => !v)} onTheme={toggleDark}
          onHelp={() => setHelp(true)} onSlideshow={() => setPlaying((v) => !v)} onFullscreen={fullscreen} />
        <div className="flex min-h-0 flex-1">
          {items.length > 0 && <Sidebar items={items} index={index} onPick={go} />}
          <main ref={main} className="min-w-0 flex-1" style={{ background: 'var(--bg)' }} aria-label="Viewer">
            {!cur ? <div className="m-8 max-w-md"><p className="text-xl font-bold">Drop a file to view it</p>
                <p style={{ color: 'var(--mute)' }}>Images, PDF, 3D models, Office documents and more. You can also paste an image, or use Open files.</p></div>
              : tooBig ? <div role="alert" className="m-8 max-w-md"><p className="font-bold">This file is over {Math.round(maxBytes / 1048576)} MB.</p>
                  <p style={{ color: 'var(--mute)' }}>Opening it may be slow or run out of memory in this tab.</p>
                  <button className="mt-3 rounded border px-3 py-1 text-sm" onClick={() => setAllowed((s) => new Set(s).add(cur.id))}>Open anyway</button></div>
              : <ErrorBoundary resetKey={cur.id}><Suspense fallback={<p role="status" className="m-8">Loading viewer…</p>}>{Viewer && <Viewer key={cur.id} file={cur.file} kind={cur.kind} siblings={files} />}</Suspense></ErrorBoundary>}
          </main>
          {info && cur && <MetadataPanel file={cur.file} kind={cur.kind} onClose={() => setInfo(false)} />}
        </div>
        <footer className="border-t px-4 py-1 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--mute)' }}>Files are processed locally and never uploaded.</footer>
      </div>
      {help && <HelpOverlay onClose={closeHelp} />}
    </Dropzone>)
}
