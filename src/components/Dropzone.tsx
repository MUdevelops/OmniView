import { useState, type ReactNode } from 'react'
import { useStore } from '../core/store'
export default function Dropzone({ children }: { children: ReactNode }) {
  const add = useStore((s) => s.add); const [over, setOver] = useState(false)
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => { void add([...(e.target.files ?? [])]); e.target.value = '' }
  return (
    <div className="relative h-full" onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void add([...e.dataTransfer.files]) }}>
      <input type="file" multiple hidden data-testid="file-input" onChange={onPick} />
      <input type="file" hidden data-testid="folder-input" onChange={onPick} {...{ webkitdirectory: '' }} />
      {children}
      {over && <div className="pointer-events-none absolute inset-0 border-4 border-dashed" style={{ borderColor: 'var(--accent)' }} aria-hidden />}
    </div>)
}
