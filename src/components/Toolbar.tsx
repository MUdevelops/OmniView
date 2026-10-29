interface Props {
  hasFile: boolean; info: boolean; dark: boolean; playing: boolean; fullscreen: boolean
  onOpenFiles: () => void; onOpenFolder: () => void; onInfo: () => void; onTheme: () => void; onHelp: () => void; onSlideshow: () => void; onFullscreen: () => void
}
const b = 'rounded border px-3 py-1 text-sm'
export default function Toolbar(p: Props) {
  return (
    <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <h1 className="mr-1 text-lg font-bold">OmniView</h1>
      <button className={b} onClick={p.onOpenFiles}>Open files</button>
      <button className={b} onClick={p.onOpenFolder}>Open folder</button>
      <div className="ml-auto flex flex-wrap items-center gap-2" role="toolbar" aria-label="Viewer actions">
        <button className={b} aria-pressed={p.playing} disabled={!p.hasFile} onClick={p.onSlideshow}>{p.playing ? 'Stop slideshow' : 'Slideshow'}</button>
        <button className={b} aria-pressed={p.fullscreen} disabled={!p.hasFile} onClick={p.onFullscreen}>Fullscreen</button>
        <button className={b} aria-pressed={p.info} disabled={!p.hasFile} onClick={p.onInfo}>Info</button>
        <button className={b} aria-label="Keyboard shortcuts" onClick={p.onHelp}>?</button>
        <button className={b} aria-pressed={p.dark} onClick={p.onTheme}>{p.dark ? 'Light' : 'Dark'}</button>
      </div>
    </header>)
}
