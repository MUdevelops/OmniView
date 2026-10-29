export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB']; let i = -1
  do { n /= 1024; i++ } while (n >= 1024 && i < u.length - 1)
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`
}
const MAX = 200
export function formatValue(v: unknown): string {
  let s: string
  if (v == null) return ''
  if (v instanceof Date) s = Number.isNaN(v.getTime()) ? '' : v.toISOString()
  else if (ArrayBuffer.isView(v)) s = `[${v.byteLength} bytes]`
  else if (v instanceof ArrayBuffer) s = `[${v.byteLength} bytes]`
  else if (Array.isArray(v)) s = v.slice(0, 20).map(formatValue).join(', ') + (v.length > 20 ? ', …' : '')
  else if (typeof v === 'object') { try { s = JSON.stringify(v) } catch { s = '[object]' } }
  else s = String(v).trim()
  return s.length > MAX ? s.slice(0, MAX) + '…' : s
}
/** Turn a merged exifr result into sorted [tag, value] rows, dropping empty values. */
export function toRows(obj: Record<string, unknown> | null | undefined): [string, string][] {
  if (!obj) return []
  return Object.entries(obj)
    .map(([k, v]) => [k, formatValue(v)] as [string, string])
    .filter(([, v]) => v !== '')
    .sort((a, b) => a[0].localeCompare(b[0]))
}
