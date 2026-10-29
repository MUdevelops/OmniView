// Single source of truth for security headers. nginx.conf, vercel.json and public/_headers must carry the same values
// (tests/unit/deployConfig.test.ts fails if they drift). `vite preview` serves them too, so the e2e suite runs under the real CSP.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'", // wasm-unsafe-eval: libheif / Ghostscript WebAssembly. No 'unsafe-eval', no inline scripts.
  "style-src 'self' 'unsafe-inline'",     // docx-preview / pptx-preview / three.js inject <style> and style attributes
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' blob: data:",       // add your converter origin here only if you enable /server
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "manifest-src 'self'",
].join('; ')
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
}
