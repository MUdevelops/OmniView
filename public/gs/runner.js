/* Classic Web Worker for the optional Ghostscript fallback (EPS / PostScript-based .ai).
 * gs.js and gs.wasm are copied here from @jspawn/ghostscript-wasm by scripts/copy-gs.mjs (npm postinstall).
 * UNVERIFIED: written from the package's Emscripten conventions, not run. Any failure is reported to the UI as a normal "cannot render" message.
 * -dSAFER stops the PostScript from touching the (virtual) file system or running commands. */
self.onmessage = async (e) => {
  try {
    importScripts('./gs.js')
    const factory = typeof Module === 'function' ? Module : null
    if (!factory) throw new Error('Ghostscript loader not found in gs.js')
    const gs = await factory({ locateFile: (p) => new URL(p, self.location.href).href, print() {}, printErr() {} })
    self.postMessage({ type: 'ready' })
    gs.FS.writeFile('input.eps', new Uint8Array(e.data.buf))
    try {
      gs.callMain(['-dBATCH', '-dNOPAUSE', '-dSAFER', '-dQUIET', '-sDEVICE=png16m', '-r144', '-dEPSCrop', '-sOutputFile=output.png', 'input.eps'])
    } catch (x) { if (!(x && x.status === 0)) throw x }
    const out = gs.FS.readFile('output.png')
    self.postMessage({ type: 'png', data: out.buffer }, [out.buffer])
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) })
  }
}
