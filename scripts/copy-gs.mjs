// postinstall: copy Ghostscript WASM from the optional dependency into public/gs/. Never fails the install.
import { existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'node_modules', '@jspawn', 'ghostscript-wasm')
const find = (dir, name, depth = 0) => {
  if (depth > 3 || !existsSync(dir)) return null
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (f === name) return p
    if (statSync(p).isDirectory()) { const r = find(p, name, depth + 1); if (r) return r }
  }
  return null
}
try {
  const js = find(pkg, 'gs.js'); const wasm = find(pkg, 'gs.wasm')
  if (!js || !wasm) { console.warn('[omniview] @jspawn/ghostscript-wasm not installed or files not found: EPS/AI Ghostscript fallback disabled.'); process.exit(0) }
  mkdirSync(join(root, 'public', 'gs'), { recursive: true })
  copyFileSync(js, join(root, 'public', 'gs', 'gs.js')); copyFileSync(wasm, join(root, 'public', 'gs', 'gs.wasm'))
  console.log('[omniview] Ghostscript WASM copied to public/gs/')
} catch (e) { console.warn('[omniview] copy-gs skipped:', e instanceof Error ? e.message : e) }
