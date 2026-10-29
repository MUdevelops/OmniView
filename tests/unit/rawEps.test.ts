import { describe, it, expect } from 'vitest'
import { findEmbeddedJpegs, largestJpeg } from '../../src/core/rawPreview'
import { parseAsciiPreview, parseDosEpsHeader } from '../../src/core/epsPreview'
import { rtfToText } from '../../src/core/rtf'
// SOI, APP0 (len 4), SOS (len 4) + entropy data containing FF00 stuffing, EOI.
const jpeg = (payload = 3) => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xda, 0, 4, 0, 0, ...new Array(payload).fill(0x12), 0xff, 0x00, 0x56, 0xff, 0xd9])
describe('rawPreview', () => {
  it('finds spans and ignores stuffed FF00 bytes in entropy data', () => {
    const j = jpeg(); const buf = Uint8Array.from([1, 2, 3, ...j, 9, 9]); const s = findEmbeddedJpegs(buf, 0)
    expect(s).toEqual([{ start: 3, end: 3 + j.length }])
  })
  it('picks the largest of several', () => {
    const small = jpeg(2); const big = jpeg(40); const buf = Uint8Array.from([...small, 0, 0, ...big, 0])
    const best = largestJpeg(buf, 0)!; expect(best.end - best.start).toBe(big.length)
  })
  it('returns null when none and skips truncated JPEGs', () => {
    expect(largestJpeg(Uint8Array.from([1, 2, 3, 4]), 0)).toBeNull()
    expect(largestJpeg(jpeg().subarray(0, 12), 0)).toBeNull()
  })
})
describe('epsPreview', () => {
  it('parses a DOS EPS header', () => {
    const b = new Uint8Array(30); b.set([0xc5, 0xd0, 0xd3, 0xc6]); const dv = new DataView(b.buffer)
    dv.setUint32(4, 30, true); dv.setUint32(8, 100, true); dv.setUint32(20, 130, true); dv.setUint32(24, 55, true)
    expect(parseDosEpsHeader(b)).toMatchObject({ psOffset: 30, psLength: 100, tiffOffset: 130, tiffLength: 55, wmfLength: 0 })
    expect(parseDosEpsHeader(new Uint8Array(30))).toBeNull()
  })
  it('parses 8-bit and 1-bit ASCII previews', () => {
    const p8 = parseAsciiPreview('%!PS\n%%BeginPreview: 2 2 8 2\n% 00FF\n% FF00\n%%EndPreview\n')!
    expect([p8.width, p8.height, p8.rgba[0], p8.rgba[4], p8.rgba[8], p8.rgba[12], p8.rgba[3]]).toEqual([2, 2, 0, 255, 255, 0, 255])
    const p1 = parseAsciiPreview('%%BeginPreview: 10 1 1 1\n% AB80\n%%EndPreview')! // row padded to 2 bytes
    expect(p1.rgba[0]).toBe(255); expect(p1.rgba[4]).toBe(0); expect(p1.width).toBe(10)
  })
  it('rejects missing, short or oversized previews', () => {
    expect(parseAsciiPreview('%!PS no preview')).toBeNull(); expect(parseAsciiPreview('%%BeginPreview: 4 4 8 4\n% 00\n')).toBeNull()
    expect(parseAsciiPreview('%%BeginPreview: 9999999 9999999 8 1\n')).toBeNull(); expect(parseAsciiPreview('%%BeginPreview: 2 2 3 2\n')).toBeNull()
  })
})
describe('rtfToText', () => {
  it('extracts text, paragraphs, unicode and escapes; skips font tables', () => {
    expect(rtfToText('{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}Hello\\par World \\u8364?\\tab\\\'e9 \\{x\\}}')).toBe('Hello\nWorld €\té {x}')
  })
  it('skips starred destinations', () => expect(rtfToText('{\\rtf1 A{\\*\\generator Foo;}B}')).toBe('AB'))
})
