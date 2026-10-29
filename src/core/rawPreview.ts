// Finds full-size JPEG previews embedded in RAW files (CR2/CR3/NEF/ARW/DNG/ORF/RW2/RAF/...).
// It walks real JPEG markers, so a stray FFD9 inside entropy data or a thumbnail nested in an APP1 segment is not mistaken for the end.
export interface JpegSpan { start: number; end: number }

function jpegEnd(b: Uint8Array, start: number): number {
  const n = b.length
  let i = start + 2
  while (i + 1 < n) {
    if (b[i] !== 0xff) return -1
    let m = b[i + 1]
    while (m === 0xff && i + 2 < n) { i++; m = b[i + 1] } // fill bytes
    if (m === 0xd9) return i + 2
    if (m === 0x00) return -1
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    if (i + 3 >= n) return -1
    const len = (b[i + 2] << 8) | b[i + 3]
    if (len < 2) return -1
    i += 2 + len
    if (m === 0xda) { // SOS: skip entropy-coded data up to the next real marker
      while (i + 1 < n && !(b[i] === 0xff && b[i + 1] !== 0x00 && !(b[i + 1] >= 0xd0 && b[i + 1] <= 0xd7))) i++
    }
  }
  return -1
}

export function findEmbeddedJpegs(b: Uint8Array, minBytes = 4096): JpegSpan[] {
  const out: JpegSpan[] = []
  let i = 0
  while (i < b.length - 3) {
    i = b.indexOf(0xff, i)
    if (i < 0) break
    if (b[i + 1] === 0xd8 && b[i + 2] === 0xff) {
      const end = jpegEnd(b, i)
      if (end > 0) { if (end - i >= minBytes) out.push({ start: i, end }); i = end; continue }
    }
    i++
  }
  return out
}

export function largestJpeg(b: Uint8Array, minBytes = 4096): JpegSpan | null {
  let best: JpegSpan | null = null
  for (const s of findEmbeddedJpegs(b, minBytes)) if (!best || s.end - s.start > best.end - best.start) best = s
  return best
}
