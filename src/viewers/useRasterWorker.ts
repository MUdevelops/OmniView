import { useCallback, useEffect, useRef, useState } from 'react'
import type { Out, PageInfo } from '../workers/rasterProtocol'

interface State { status: 'loading' | 'ready' | 'error'; pages: PageInfo[]; page: number; image: ImageData | null; error?: string }
const init: State = { status: 'loading', pages: [], page: 0, image: null }

/** Decodes a multi-page raster file in a worker. Switching files terminates the worker, which cancels any decode in flight. */
export function useRasterWorker(file: File, create: () => Worker) {
  const [s, setS] = useState<State>(init)
  const wRef = useRef<Worker>()
  useEffect(() => {
    let dead = false
    setS(init)
    const w = create(); wRef.current = w
    const fail = (message: string) => { if (!dead) setS((p) => ({ ...p, status: 'error', image: null, error: message })) }
    w.onmessage = (e: MessageEvent<Out>) => {
      if (dead) return
      const m = e.data
      if (m.type === 'opened') {
        if (!m.pages.length) return fail('No images were found in this file.')
        setS((p) => ({ ...p, pages: m.pages })); w.postMessage({ type: 'page', index: 0 })
      } else if (m.type === 'page') {
        setS((p) => (m.index !== p.page ? p : { ...p, status: 'ready', error: undefined, image: new ImageData(new Uint8ClampedArray(m.data), m.width, m.height) }))
      } else fail(m.message)
    }
    w.onerror = (ev) => fail(ev.message || 'The decoder crashed.')
    file.arrayBuffer().then((buf) => { if (!dead) w.postMessage({ type: 'open', buf }, [buf]) }).catch(() => fail('Could not read the file.'))
    return () => { dead = true; w.terminate(); wRef.current = undefined }
  }, [file, create])
  const setPage = useCallback((i: number) => {
    setS((p) => ({ ...p, page: i, status: 'loading', image: null, error: undefined }))
    wRef.current?.postMessage({ type: 'page', index: i })
  }, [])
  return { ...s, setPage }
}
