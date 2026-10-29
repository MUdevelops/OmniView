// Runs the pure detection/extraction logic against every real fixture. Usage: node --experimental-strip-types --no-warnings scripts/verify-fixtures.mjs
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sniffBytes, refineKind } from '../src/core/fileSniffer.ts'
import { largestJpeg } from '../src/core/rawPreview.ts'
import { parseAsciiPreview, parseDosEpsHeader } from '../src/core/epsPreview.ts'
import { rtfToText } from '../src/core/rtf.ts'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'tests', 'fixtures')
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
let fail = 0
const check = (ok, label, extra = '') => { if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`) }
for (const f of readdirSync(dir).filter((f) => f !== 'manifest.json').sort()) {
  const head = new Uint8Array(readFileSync(join(dir, f)).subarray(0, 65536))
  const kind = refineKind(sniffBytes(head), extname(f).slice(1), head)
  check(kind === manifest[f], `detect ${f}`, `-> ${kind}${kind === manifest[f] ? '' : ' (expected ' + manifest[f] + ')'}`)
}
const raw = new Uint8Array(readFileSync(join(dir, 'photo.dng')))
const span = largestJpeg(raw); check(!!span, 'RAW: embedded preview found', span && `${span.end - span.start} bytes @${span.start}`)
mkdirSync('/tmp/omniview-verify', { recursive: true }); if (span) writeFileSync('/tmp/omniview-verify/preview.jpg', raw.subarray(span.start, span.end))
check(largestJpeg(new Uint8Array(readFileSync(join(dir, 'photo-nopreview.dng')))) === null, 'RAW: no preview -> null')
const ascii = parseAsciiPreview(new TextDecoder('latin1').decode(readFileSync(join(dir, 'preview.eps'))))
check(ascii && ascii.width === 64 && ascii.height === 48 && ascii.rgba.some((v, i) => i % 4 === 0 && v > 0 && v < 255), 'EPS: ASCII preview parsed', ascii && `${ascii.width}x${ascii.height}`)
const dos = parseDosEpsHeader(new Uint8Array(readFileSync(join(dir, 'dos-tiff-preview.eps'))))
const dosBytes = readFileSync(join(dir, 'dos-tiff-preview.eps'))
check(dos && dos.tiffLength > 0 && dosBytes.subarray(dos.tiffOffset, dos.tiffOffset + 4).toString('hex') === '49492a00', 'EPS: DOS header + TIFF preview located', dos && `tiff @${dos.tiffOffset} len ${dos.tiffLength}`)
check(parseAsciiPreview(readFileSync(join(dir, 'nopreview.eps'), 'latin1')) === null && parseDosEpsHeader(new Uint8Array(readFileSync(join(dir, 'nopreview.eps')))) === null, 'EPS: no preview -> null')
const rtf = rtfToText(readFileSync(join(dir, 'sample.rtf'), 'latin1')); check(rtf.includes('OmniView Word Fixture') && rtf.includes('quick brown fox'), 'RTF: text extracted', JSON.stringify(rtf.slice(0, 50)))
console.log(fail ? `\n${fail} FAILED` : '\nall passed'); process.exit(fail ? 1 : 0)
