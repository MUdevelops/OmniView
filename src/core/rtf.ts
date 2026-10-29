// Best-effort RTF → plain text. Skips font/colour tables, pictures and other non-text destinations.
const SKIP = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'header', 'footer', 'footnote', 'generator', 'themedata', 'datastore'])
export function rtfToText(src: string): string {
  let out = ''; let skip = false; let i = 0
  const stack: boolean[] = []
  while (i < src.length) {
    const c = src[i]
    if (c === '{') {
      stack.push(skip); i++
      if (src[i] === '\\' && src[i + 1] === '*') skip = true
      else if (src[i] === '\\') { const m = /^\\([a-zA-Z]+)/.exec(src.slice(i, i + 24)); if (m && SKIP.has(m[1])) skip = true }
      continue
    }
    if (c === '}') { skip = stack.pop() ?? false; i++; continue }
    if (c === '\\') {
      const n = src[i + 1]
      if (n === '\\' || n === '{' || n === '}') { if (!skip) out += n; i += 2; continue }
      if (n === "'") { if (!skip) out += String.fromCharCode(parseInt(src.substr(i + 2, 2), 16) || 63); i += 4; continue }
      if (n === '~') { if (!skip) out += '\u00a0'; i += 2; continue }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(src.slice(i, i + 32))
      if (!m) { i += 2; continue }
      i += m[0].length
      if (skip) continue
      const w = m[1]
      if (w === 'par' || w === 'line') out += '\n'
      else if (w === 'tab') out += '\t'
      else if (w === 'u' && m[2]) {
        const code = parseInt(m[2], 10); out += String.fromCharCode(code < 0 ? code + 65536 : code)
        if (src[i] === '\\' && src[i + 1] === "'") i += 4; else i += 1 // skip the ANSI fallback character
      }
      continue
    }
    if (!skip && c !== '\r' && c !== '\n') out += c
    i++
  }
  return out.replace(/\n{3,}/g, '\n\n').trim()
}
