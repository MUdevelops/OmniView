// Regenerates vercel.json, public/_headers (Netlify + Cloudflare Pages) and nginx/security-headers.conf from config/headers.ts.
// Run: node --experimental-strip-types --no-warnings scripts/sync-headers.mjs
import { writeFileSync } from 'node:fs'
import { SECURITY_HEADERS } from '../config/headers.ts'
const H = Object.entries(SECURITY_HEADERS)
writeFileSync('public/_headers', ['/*', ...H.map(([k, v]) => `  ${k}: ${v}`), '/*.wasm', '  Content-Type: application/wasm', '/sw.js', '  Cache-Control: no-cache', '/index.html', '  Cache-Control: no-cache', '/assets/*', '  Cache-Control: public, max-age=31536000, immutable', ''].join('\n'))
writeFileSync('vercel.json', JSON.stringify({
  $schema: 'https://openapi.vercel.sh/vercel.json', framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist',
  headers: [
    { source: '/(.*)', headers: H.map(([key, value]) => ({ key, value })) },
    { source: '/(.*)\\.wasm', headers: [{ key: 'Content-Type', value: 'application/wasm' }] },
    { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
    { source: '/assets/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ],
}, null, 2) + '\n')
writeFileSync('nginx/security-headers.conf', H.map(([k, v]) => `add_header ${k} "${v}" always;`).join('\n') + '\n')
console.log('headers synced')
