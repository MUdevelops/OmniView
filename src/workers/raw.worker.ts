import { largestJpeg } from '../core/rawPreview'
interface Req { buf: ArrayBuffer }
type Res = { type: 'preview'; data: ArrayBuffer } | { type: 'none' } | { type: 'error'; message: string }
const post = (m: Res, t?: Transferable[]) => (self as unknown as { postMessage(m: Res, t?: Transferable[]): void }).postMessage(m, t)
self.addEventListener('message', (e: MessageEvent<Req>) => {
  try {
    const bytes = new Uint8Array(e.data.buf)
    const span = largestJpeg(bytes)
    if (!span) return post({ type: 'none' })
    const copy = bytes.slice(span.start, span.end) // own buffer so it can be transferred
    post({ type: 'preview', data: copy.buffer }, [copy.buffer])
  } catch (err) { post({ type: 'error', message: err instanceof Error ? err.message : 'RAW scan failed' }) }
})
