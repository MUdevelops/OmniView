import { describe, it, expect } from 'vitest'
import { sniffBytes, refineKind, looksLikeText } from '../../src/core/fileSniffer'
const enc = (s: string) => new TextEncoder().encode(s)
const pad = (...n: number[]) => Uint8Array.from([...n, ...new Array(64).fill(0)])
const at = (o: number, s: string) => { const b = new Uint8Array(128); b.set(enc(s), o); return b }
describe('sniffBytes', () => {
  it('detects png/jpeg/pdf by magic', () => {
    expect(sniffBytes(pad(0x89, 0x50, 0x4e, 0x47))).toBe('png')
    expect(sniffBytes(pad(0xff, 0xd8, 0xff))).toBe('jpeg')
    expect(sniffBytes(enc('%PDF-1.7'))).toBe('pdf')
  })
  it('detects svg text', () => expect(sniffBytes(enc('<svg xmlns="x"/>'))).toBe('svg'))
  it('returns unknown for noise', () => expect(sniffBytes(pad(1, 2, 3))).toBe('unknown'))
  it('detects heic/avif brands, tiff, psd, glb, rtf, eps, ole', () => {
    expect(sniffBytes(at(4, 'ftypheic'))).toBe('heic'); expect(sniffBytes(at(4, 'ftypavif'))).toBe('avif')
    expect(sniffBytes(pad(0x49, 0x49, 0x2a, 0x00))).toBe('tiff'); expect(sniffBytes(enc('8BPS'))).toBe('psd')
    expect(sniffBytes(enc('glTF'))).toBe('glb'); expect(sniffBytes(enc('{\\rtf1'))).toBe('rtf')
    expect(sniffBytes(pad(0xc5, 0xd0, 0xd3, 0xc6))).toBe('eps'); expect(sniffBytes(enc('%!PS-Adobe-3.0 EPSF-3.0'))).toBe('eps')
    expect(sniffBytes(pad(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe('legacy')
  })
  it('detects RAW containers', () => {
    expect(sniffBytes(pad(0x49, 0x49, 0x55, 0x00))).toBe('raw') // RW2
    expect(sniffBytes(pad(0x49, 0x49, 0x52, 0x4f))).toBe('raw') // ORF
    const cr2 = pad(0x49, 0x49, 0x2a, 0x00, 0x10, 0, 0, 0, 0x43, 0x52); expect(sniffBytes(cr2)).toBe('raw')
    expect(sniffBytes(at(4, 'ftypcrx '))).toBe('raw')
  })
})
describe('refineKind', () => {
  it('splits ZIP containers by content, then extension', () => {
    expect(refineKind('zip', 'txt', enc('PK\u0003\u0004 ... word/document.xml ...'))).toBe('docx')
    expect(refineKind('zip', 'x', enc('xl/workbook.xml'))).toBe('xlsx')
    expect(refineKind('zip', 'x', enc('ppt/presentation.xml'))).toBe('pptx')
    const odt = new Uint8Array(128); odt.set(enc('mimetypeapplication/vnd.oasis.opendocument.text'), 30)
    expect(refineKind('zip', 'zip', odt)).toBe('odt')
    expect(refineKind('zip', 'zip', new Uint8Array(8))).toBe('zip')
    expect(refineKind('zip', 'pptx', new Uint8Array(8))).toBe('pptx')
  })
  it('routes TIFF-based RAW by extension and PostScript .ai separately', () => {
    expect(refineKind('tiff', 'dng', new Uint8Array(8))).toBe('raw'); expect(refineKind('tiff', 'tif', new Uint8Array(8))).toBe('tiff')
    expect(refineKind('eps', 'ai', new Uint8Array(8))).toBe('ai'); expect(refineKind('eps', 'eps', new Uint8Array(8))).toBe('eps')
  })
  it('falls back to extension and text sniffing only when magic is unknown', () => {
    expect(refineKind('unknown', 'csv', enc('a,b'))).toBe('csv'); expect(refineKind('unknown', 'doc', new Uint8Array(4))).toBe('legacy')
    expect(refineKind('unknown', 'log', enc('plain text'))).toBe('text'); expect(refineKind('unknown', 'dat', Uint8Array.from([0, 1, 2]))).toBe('unknown')
    expect(refineKind('unknown', 'ai', enc('junk %PDF-1.4'))).toBe('pdf'); expect(refineKind('unknown', 'raw', new Uint8Array(8))).toBe('raw')
    expect(refineKind('png', 'jpg', new Uint8Array(8))).toBe('png') // mislabeled: magic wins
    expect(refineKind('legacy', 'xls', new Uint8Array(8))).toBe('xlsx')
  })
  it('looksLikeText rejects binary and invalid UTF-8', () => {
    expect(looksLikeText(enc('héllo\nworld'))).toBe(true); expect(looksLikeText(Uint8Array.from([0xff, 0xfe, 0x00]))).toBe(false); expect(looksLikeText(new Uint8Array(0))).toBe(false)
  })
})
