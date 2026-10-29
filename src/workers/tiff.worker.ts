import * as UTIF from 'utif2'
import { errMsg, type In, type Out } from './rasterProtocol'

const post = (m: Out, t?: Transferable[]) => (self as unknown as { postMessage(m: Out, t?: Transferable[]): void }).postMessage(m, t)
let buf: ArrayBuffer | null = null
let ifds: UTIF.IFD[] = []

self.addEventListener('message', (e: MessageEvent<In>) => {
  const m = e.data
  try {
    if (m.type === 'open') {
      buf = m.buf
      const all = UTIF.decode(buf).filter((i) => i.t256 && i.t257)
      // NewSubfileType bit 0 = reduced-resolution copy (thumbnail); not a real page.
      const real = all.filter((i) => !(((i.t254?.[0] as number | undefined) ?? 0) & 1))
      ifds = real.length ? real : all
      post({ type: 'opened', pages: ifds.map((i) => ({ width: i.t256[0] as number, height: i.t257[0] as number })) })
    } else {
      const ifd = ifds[m.index]
      if (!ifd || !buf) throw new Error('Page not found')
      UTIF.decodeImage(buf, ifd)
      const copy = UTIF.toRGBA8(ifd).slice() // own buffer, safe to transfer
      ifd.data = new Uint8Array(0)
      post({ type: 'page', index: m.index, width: ifd.width, height: ifd.height, data: copy.buffer as ArrayBuffer }, [copy.buffer as ArrayBuffer])
    }
  } catch (err) {
    post({ type: 'error', message: errMsg(err) })
  }
})
