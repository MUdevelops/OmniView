import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import type { ViewerProps } from '../core/registry'

const ROW_H = 28; const COL_W = 140; const GUTTER = 56; const MAX_COLS = 256
type Sheet = { name: string; rows: string[][]; cols: number }

function toSheets(wb: XLSX.WorkBook): Sheet[] {
  return wb.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], { header: 1, raw: false, defval: '', blankrows: true })
    return { name, rows, cols: Math.min(MAX_COLS, rows.reduce((m, r) => Math.max(m, r.length), 0)) }
  })
}

export default function SheetViewer({ file, kind }: ViewerProps) {
  const [sheets, setSheets] = useState<Sheet[] | null>(null)
  const [err, setErr] = useState<string>()
  const [active, setActive] = useState(0)
  useEffect(() => {
    let dead = false
    setSheets(null); setErr(undefined); setActive(0)
    ;(async () => {
      try {
        await new Promise((r) => setTimeout(r, 0)) // let "Reading…" paint
        const wb = kind === 'csv'
          ? XLSX.read(await file.text(), { type: 'string' })
          : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
        if (!dead) setSheets(toSheets(wb))
      } catch (e) { if (!dead) setErr(e instanceof Error ? e.message : 'Could not read this spreadsheet.') }
    })()
    return () => { dead = true }
  }, [file, kind])
  if (err) return <div role="alert" className="m-8 max-w-md"><p className="font-bold">This spreadsheet could not be read.</p><p style={{ color: 'var(--mute)' }}>{err}</p></div>
  if (!sheets) return <p role="status" className="m-8">Reading spreadsheet…</p>
  if (!sheets.length) return <p className="m-8">This file has no sheets.</p>
  const cur = sheets[Math.min(active, sheets.length - 1)]
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Grid key={`${file.name}:${active}`} sheet={cur} />
      <div role="tablist" aria-label="Sheets" className="flex gap-1 overflow-x-auto border-t p-1" style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        {sheets.map((s, i) => <button key={s.name + i} role="tab" aria-selected={i === active} onClick={() => setActive(i)}
          className="whitespace-nowrap rounded px-3 py-1 text-sm" style={i === active ? { background: 'var(--bg)', fontWeight: 700 } : undefined}>{s.name}</button>)}
      </div>
    </div>)
}

/** Read-only virtualized grid: only the rows in view are in the DOM. */
function Grid({ sheet }: { sheet: Sheet }) {
  const box = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(0); const [vh, setVh] = useState(600)
  useEffect(() => {
    const el = box.current; if (!el) return
    const ro = new ResizeObserver(() => setVh(el.clientHeight)); ro.observe(el); setVh(el.clientHeight)
    return () => ro.disconnect()
  }, [])
  const first = Math.max(0, Math.floor(top / ROW_H) - 5)
  const last = Math.min(sheet.rows.length, Math.ceil((top + vh) / ROW_H) + 5)
  const cols = useMemo(() => Array.from({ length: sheet.cols }, (_, c) => XLSX.utils.encode_col(c)), [sheet.cols])
  const width = GUTTER + sheet.cols * COL_W
  const cell = 'truncate border-b border-r px-2 leading-7'
  return (
    <div ref={box} className="min-h-0 flex-1 overflow-auto text-sm" onScroll={(e) => setTop(e.currentTarget.scrollTop)} data-testid="sheet-grid" role="table" aria-label="Spreadsheet" aria-rowcount={sheet.rows.length} aria-colcount={sheet.cols}>
      <div style={{ width, height: ROW_H * (sheet.rows.length + 1), position: 'relative' }}>
        <div role="row" className="sticky top-0 z-10 flex" style={{ height: ROW_H, width, background: 'var(--panel)', fontWeight: 700 }}>
          <div className={cell} style={{ width: GUTTER, borderColor: 'var(--line)' }} />
          {cols.map((c) => <div key={c} role="columnheader" className={cell} style={{ width: COL_W, borderColor: 'var(--line)' }}>{c}</div>)}
        </div>
        {sheet.rows.slice(first, last).map((row, i) => {
          const r = first + i
          return (
            <div key={r} role="row" aria-rowindex={r + 1} className="absolute flex" style={{ top: (r + 1) * ROW_H, height: ROW_H, width }}>
              <div className={cell} style={{ width: GUTTER, color: 'var(--mute)', borderColor: 'var(--line)', background: 'var(--panel)' }}>{r + 1}</div>
              {cols.map((c, ci) => <div key={c} role="cell" className={cell} style={{ width: COL_W, borderColor: 'var(--line)' }} title={String(row[ci] ?? '')}>{String(row[ci] ?? '')}</div>)}
            </div>)
        })}
      </div>
      {sheet.rows.length === 0 && <p className="p-4" style={{ color: 'var(--mute)' }}>This sheet is empty.</p>}
    </div>)
}
