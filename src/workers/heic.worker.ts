import libheif from 'libheif-js/wasm-bundle'
import type { HeifImage } from 'libheif-js/wasm-bundle'
import { errMsg, type In, type Out } from './rasterProtocol'

const post = (m: Out, t?: Transferable[]) => (self as unknown as { postMessage(m: Out, t?: Transferable[]): void }).postMessage(m, t)
let images: HeifImage[] = []

self.addEventListener('message', (e: MessageEvent<In>) => {
  void (async () => {
    const m = e.data
    try {
      if (m.type === 'open') {
        images = new libheif.HeifDecoder().decode(new Uint8Array(m.buf))
        if (!images?.length) throw new Error('No images found in this HEIF file')
        post({ type: 'opened', pages: images.map((i) => ({ width: i.get_width(), height: i.get_height() })) })
      } else {
        const img = images[m.index]
        if (!img) throw new Error('Image not found')
        const width = img.get_width(); const height = img.get_height()
        const target = { data: new Uint8ClampedArray(width * height * 4), width, height }
        await new Promise<void>((ok, fail) => img.display(target, (d) => (d ? ok() : fail(new Error('HEIC decode failed')))))
        post({ type: 'page', index: m.index, width, height, data: target.data.buffer as ArrayBuffer }, [target.data.buffer as ArrayBuffer])
      }
    } catch (err) {
      post({ type: 'error', message: errMsg(err) })
    }
  })()
})
