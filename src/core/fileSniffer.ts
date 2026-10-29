// Pure, dependency-free detection so it can run in the app, in Vitest and under plain Node.
export type FileKind =
  | 'jpeg' | 'png' | 'gif' | 'webp' | 'avif' | 'bmp' | 'svg' | 'tiff' | 'heic' | 'psd' | 'raw' | 'eps' | 'ai'
  | 'pdf' | 'glb' | 'gltf' | 'obj' | 'mtl' | 'bin'
  | 'docx' | 'xlsx' | 'pptx' | 'odt' | 'ods' | 'odp' | 'rtf' | 'csv' | 'text' | 'legacy'
  | 'zip' | 'unknown'

const eq = (b: Uint8Array, s: number[], o = 0) => s.length + o <= b.length && s.every((v, i) => b[o + i] === v)
const ascii = (b: Uint8Array, o: number, n: number) => { let s = ''; for (let i = o; i < Math.min(o + n, b.length); i++) s += String.fromCharCode(b[i]); return s }

export const RAW_EXT = new Set(['raw', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'dng', 'orf', 'rw2', 'raf', 'pef', 'srw'])
const EXT: Record<string, FileKind> = {
  jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp', avif: 'avif', bmp: 'bmp', svg: 'svg',
  tif: 'tiff', tiff: 'tiff', heic: 'heic', heif: 'heic', psd: 'psd', pdf: 'pdf', ai: 'ai', eps: 'eps', ps: 'eps',
  glb: 'glb', gltf: 'gltf', obj: 'obj', mtl: 'mtl', bin: 'bin',
  docx: 'docx', xlsx: 'xlsx', xlsm: 'xlsx', xls: 'xlsx', pptx: 'pptx', odt: 'odt', ods: 'ods', odp: 'odp',
  rtf: 'rtf', csv: 'csv', tsv: 'csv', txt: 'text', md: 'text', markdown: 'text', doc: 'legacy', ppt: 'legacy',
  ...Object.fromEntries([...RAW_EXT].map((e) => [e, 'raw' as FileKind])),
}

/** Magic-byte detection only. `b` may be any prefix of the file (512 bytes is enough except for ZIP refinement). */
export function sniffBytes(b: Uint8Array): FileKind {
  if (eq(b, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (eq(b, [0x89, 0x50, 0x4e, 0x47])) return 'png'
  if (ascii(b, 0, 3) === 'GIF') return 'gif'
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp'
  if (eq(b, [0xc5, 0xd0, 0xd3, 0xc6])) return 'eps' // DOS EPS binary header
  if (eq(b, [0x49, 0x49, 0x55, 0x00]) || eq(b, [0x49, 0x49, 0x52, 0x4f]) || eq(b, [0x49, 0x49, 0x52, 0x53])) return 'raw' // RW2 / ORF
  if (ascii(b, 0, 15) === 'FUJIFILMCCD-RAW') return 'raw'
  if (eq(b, [0x49, 0x49, 0x2a, 0x00]) || eq(b, [0x4d, 0x4d, 0x00, 0x2a])) return ascii(b, 8, 2) === 'CR' ? 'raw' : 'tiff' // CR2 is TIFF + "CR"
  if (ascii(b, 0, 2) === 'BM') return 'bmp'
  if (ascii(b, 0, 4) === '8BPS') return 'psd'
  if (ascii(b, 0, 5) === '%PDF-') return 'pdf'
  if (ascii(b, 0, 4) === 'glTF') return 'glb'
  if (ascii(b, 0, 5) === '{\\rtf') return 'rtf'
  if (eq(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'legacy' // OLE/CFB: .doc .ppt .xls
  if (ascii(b, 4, 4) === 'ftyp') {
    const brand = ascii(b, 8, 4)
    if (brand === 'avif' || brand === 'avis') return 'avif'
    if (brand === 'crx ') return 'raw' // Canon CR3
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(brand)) return 'heic'
  }
  if (eq(b, [0x50, 0x4b, 0x03, 0x04])) return 'zip'
  if (ascii(b, 0, 4) === '%!PS') return 'eps'
  const head = ascii(b, 0, 512).trimStart().toLowerCase()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg'
  return 'unknown'
}

export function looksLikeText(b: Uint8Array): boolean {
  if (!b.length) return false
  for (let i = 0; i < b.length; i++) { const c = b[i]; if (c === 0 || (c < 9) || (c > 13 && c < 32 && c !== 27)) return false }
  try { new TextDecoder('utf-8', { fatal: true }).decode(b, { stream: true }); return true } catch { return false }
}

/** Combine magic bytes with extension. Magic always wins over a wrong extension; the extension only breaks ties. */
export function refineKind(kind: FileKind, ext: string, head: Uint8Array): FileKind {
  ext = ext.toLowerCase()
  switch (kind) {
    case 'zip': {
      const mime = ascii(head, 30, 8) === 'mimetype' ? ascii(head, 38, 80) : ''
      if (mime.includes('opendocument.text')) return 'odt'
      if (mime.includes('opendocument.spreadsheet')) return 'ods'
      if (mime.includes('opendocument.presentation')) return 'odp'
      const text = ascii(head, 0, head.length)
      if (text.includes('word/document.xml')) return 'docx'
      if (text.includes('xl/workbook.xml')) return 'xlsx'
      if (text.includes('ppt/presentation.xml')) return 'pptx'
      const byExt = EXT[ext]
      return byExt && ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(byExt) ? byExt : 'zip'
    }
    case 'legacy': return ext === 'xls' ? 'xlsx' : 'legacy' // SheetJS reads binary .xls
    case 'tiff': return RAW_EXT.has(ext) ? 'raw' : 'tiff'
    case 'eps': return ext === 'ai' ? 'ai' : 'eps'
    case 'unknown': {
      if (ext === 'ai' && ascii(head, 0, 1024).includes('%PDF-')) return 'pdf' // PDF-compatible Illustrator file with leading junk
      return EXT[ext] ?? (looksLikeText(head) ? 'text' : 'unknown')
    }
    default: return kind
  }
}

export async function sniffFile(f: File): Promise<FileKind> {
  const head = new Uint8Array(await f.slice(0, 65536).arrayBuffer())
  const ext = f.name.includes('.') ? f.name.split('.').pop()! : ''
  return refineKind(sniffBytes(head), ext, head)
}
