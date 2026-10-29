// EPS preview extraction that needs no PostScript interpreter.
export interface DosEpsHeader { psOffset: number; psLength: number; wmfOffset: number; wmfLength: number; tiffOffset: number; tiffLength: number }

/** DOS EPS binary header: magic C5D0D3C6 followed by six little-endian u32 offsets/lengths. */
export function parseDosEpsHeader(b: Uint8Array): DosEpsHeader | null {
  if (b.length < 30 || b[0] !== 0xc5 || b[1] !== 0xd0 || b[2] !== 0xd3 || b[3] !== 0xc6) return null
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  return { psOffset: dv.getUint32(4, true), psLength: dv.getUint32(8, true), wmfOffset: dv.getUint32(12, true), wmfLength: dv.getUint32(16, true), tiffOffset: dv.getUint32(20, true), tiffLength: dv.getUint32(24, true) }
}

export interface AsciiPreview { width: number; height: number; depth: number; rgba: Uint8ClampedArray }
/**
 * %%BeginPreview: width height depth lines  …  hex lines each starting with "%"  …  %%EndPreview
 * Rows start on byte boundaries. Sample 0 is treated as black, the maximum sample as white (not yet checked against an Adobe-produced file).
 */
export function parseAsciiPreview(text: string): AsciiPreview | null {
  const m = /%%BeginPreview:\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/.exec(text)
  if (!m) return null
  const width = +m[1]; const height = +m[2]; const depth = +m[3]
  if (!width || !height || ![1, 2, 4, 8].includes(depth) || width * height > 64_000_000) return null
  const body = text.slice(m.index + m[0].length)
  const end = body.indexOf('%%EndPreview')
  const hex = (end >= 0 ? body.slice(0, end) : body).split(/\r\n|\r|\n/).map((l) => (l.startsWith('%') ? l.slice(1) : '')).join('').replace(/[^0-9a-fA-F]/g, '')
  const rowBytes = Math.ceil((width * depth) / 8)
  if (hex.length < rowBytes * height * 2) return null
  const max = (1 << depth) - 1
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = x * depth
      const byte = parseInt(hex.substr((y * rowBytes + (bit >> 3)) * 2, 2), 16)
      const v = (byte >> (8 - depth - (bit & 7))) & max
      const g = Math.round((v * 255) / max); const o = (y * width + x) * 4
      rgba[o] = rgba[o + 1] = rgba[o + 2] = g; rgba[o + 3] = 255
    }
  }
  return { width, height, depth, rgba }
}
