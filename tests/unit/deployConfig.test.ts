import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { CSP, SECURITY_HEADERS } from '../../config/headers'
const read = (p: string) => readFileSync(p, 'utf8')
describe('security headers stay identical across deploy targets', () => {
  it('CSP only allows self, blob: and data: (plus wasm-unsafe-eval) and a blob: worker-src', () => {
    expect(CSP).toContain("default-src 'self'"); expect(CSP).toContain('worker-src \'self\' blob:'); expect(CSP).toContain("object-src 'none'")
    expect(CSP).not.toMatch(/https?:\/\//); expect(CSP).not.toContain("'unsafe-eval'"); expect(CSP).not.toMatch(/script-src[^;]*'unsafe-inline'/)
  })
  for (const [name, file] of [['nginx', 'nginx/security-headers.conf'], ['vercel', 'vercel.json'], ['netlify/cloudflare', 'public/_headers']] as const) {
    it(`${name} carries every header verbatim`, () => {
      const text = read(file)
      const norm = name === 'vercel' ? (JSON.parse(text).headers[0].headers as { key: string; value: string }[]).map((h) => `${h.key}: ${h.value}`).join('\n') : text
      for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(norm).toContain(name === 'nginx' ? `add_header ${k} "${v}" always;` : `${k}: ${v}`)
    })
  }
  it('serves .wasm as application/wasm everywhere', () => {
    expect(read('nginx/default.conf')).toContain('application/wasm wasm'); expect(read('vercel.json')).toContain('application/wasm'); expect(read('public/_headers')).toContain('application/wasm')
  })
})
