import { useEffect, useRef } from 'react'
const KEYS: [string, string][] = [
  ['← / →', 'Previous / next file'], ['+  /  −', 'Zoom in / out (images)'], ['0', 'Fit to window'], ['R', 'Rotate 90° (view only)'],
  ['I', 'Toggle info panel'], ['F', 'Toggle fullscreen'], ['S', 'Start / stop slideshow'], ['PageUp / PageDown', 'Previous / next slide (presentations)'], ['? or H', 'Show this help'], ['Esc', 'Close dialogs'],
]
/** Modal dialog: focus moves in on open, Tab is trapped, Esc closes, focus returns to the opener. */
export default function HelpOverlay({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null); const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    close.current?.focus()
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Tab') { e.preventDefault(); close.current?.focus() } // the close button is the only focusable element
    }
    addEventListener('keydown', k, true)
    return () => { removeEventListener('keydown', k, true); opener?.focus?.() }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(0,0,0,.5)' }} onClick={onClose}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="help-title" className="max-h-full w-full max-w-md overflow-auto rounded border p-4" style={{ background: 'var(--panel)', borderColor: 'var(--line)' }} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 id="help-title" className="text-lg font-bold">Keyboard shortcuts</h2>
          <button ref={close} className="rounded border px-2 py-0.5 text-sm" aria-label="Close help" onClick={onClose}>✕</button></div>
        <dl className="text-sm">{KEYS.map(([k, d]) => <div key={k} className="flex justify-between gap-4 border-b py-1.5" style={{ borderColor: 'var(--line)' }}><dt><kbd className="rounded border px-1.5 py-0.5 font-mono text-xs" style={{ borderColor: 'var(--line)' }}>{k}</kbd></dt><dd>{d}</dd></div>)}</dl>
      </div>
    </div>)
}
