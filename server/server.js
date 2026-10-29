// Optional conversion microservice. No dependencies. DISABLED unless ENABLE_CONVERSION=true.
// POST /convert?filename=report.doc   (raw file bytes as the body)  ->  application/pdf
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'

const ENABLED = process.env.ENABLE_CONVERSION === 'true'
const PORT = Number(process.env.PORT ?? 8080)
const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 50) * 1024 * 1024
const TIMEOUT_MS = Number(process.env.CONVERT_TIMEOUT_S ?? 60) * 1000
const MAX_JOBS = Number(process.env.MAX_CONCURRENT ?? 2)
const ORIGIN = process.env.ALLOWED_ORIGIN ?? ''            // e.g. https://viewer.example.com ; empty = no CORS headers (same-origin only)
const SOFFICE = process.env.SOFFICE_BIN ?? 'soffice'
const ALLOWED = new Set(['.doc', '.ppt', '.xls', '.rtf', '.odt', '.odp', '.ods', '.docx', '.pptx', '.xlsx'])
let running = 0

const cors = (res) => { if (ORIGIN) { res.setHeader('Access-Control-Allow-Origin', ORIGIN); res.setHeader('Vary', 'Origin'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type') } }
const send = (res, code, body, type = 'text/plain; charset=utf-8') => { cors(res); res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }); res.end(body) }

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0
    req.on('data', (c) => { n += c.length; if (n > MAX_BYTES) { reject(Object.assign(new Error('File too large'), { code: 413 })); req.destroy() } else chunks.push(c) })
    req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject)
  })
}
function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env, stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''
    p.stderr.on('data', (d) => { err += d.toString().slice(0, 2000) })
    const t = setTimeout(() => { p.kill('SIGKILL'); reject(Object.assign(new Error('Conversion timed out'), { code: 504 })) }, TIMEOUT_MS)
    p.on('error', (e) => { clearTimeout(t); reject(e) })
    p.on('close', (c) => { clearTimeout(t); c === 0 ? resolve() : reject(new Error('LibreOffice failed: ' + err.trim().slice(-300))) })
  })
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  if (url.pathname === '/healthz') return send(res, 200, JSON.stringify({ ok: true, conversion: ENABLED }), 'application/json')
  if (!ENABLED) return send(res, 503, 'Conversion is disabled. Set ENABLE_CONVERSION=true to enable it.')
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end() }
  if (url.pathname !== '/convert' || req.method !== 'POST') return send(res, 404, 'Not found')
  const ext = extname(url.searchParams.get('filename') ?? '').toLowerCase()
  if (!ALLOWED.has(ext)) return send(res, 415, 'Unsupported file type')
  if (running >= MAX_JOBS) return send(res, 429, 'Server busy, try again shortly')
  running++
  let dir
  try {
    const body = await readBody(req)
    if (!body.length) return send(res, 400, 'Empty body')
    dir = await mkdtemp(join(tmpdir(), 'omniview-'))
    const input = join(dir, `${randomUUID()}${ext}`)           // server-chosen name: the client-supplied name is never used on disk
    await writeFile(input, body)
    await run(SOFFICE, ['--headless', '--norestore', `-env:UserInstallation=file://${dir}/profile`, '--convert-to', 'pdf', '--outdir', dir, input], { PATH: process.env.PATH, HOME: dir })
    const pdf = await readFile(input.replace(/\.[^.]+$/, '.pdf'))
    send(res, 200, pdf, 'application/pdf')
  } catch (e) { send(res, e.code === 413 || e.code === 504 ? e.code : 500, e.message ?? 'Conversion failed') }
  finally { running--; if (dir) rm(dir, { recursive: true, force: true }).catch(() => {}) }
}).listen(PORT, () => console.log(`omniview-converter on :${PORT} (conversion ${ENABLED ? 'ENABLED' : 'disabled'})`))
