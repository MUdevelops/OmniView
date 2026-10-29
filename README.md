# OmniView

A view-only universal file viewer. It runs **100% in the browser**: files are never uploaded, there are no analytics and no third-party requests at runtime. No editing features anywhere.

> **Status:** all code and fixtures are written and the detection / extraction logic has been run against real fixtures, but the full `build → lint → typecheck → test → e2e` pipeline has **not** been run (the authoring sandbox had no network access). See [VERIFICATION.md](./VERIFICATION.md) for exactly what was and was not run. Follow "First run" below.

## First run
```bash
npm install                 # also runs scripts/copy-gs.mjs (optional Ghostscript WASM; never fails the install)
npx playwright install chromium
npm run typecheck && npm run lint && npm test
npm run test:e2e            # builds, serves `vite preview` with the production CSP, runs one+ test per format
npm run dev                 # http://localhost:5173
```
Commit the generated `package-lock.json` (the Dockerfile uses `npm ci` when it exists).
If a pinned version does not resolve, run `npm view <pkg> versions` and re-pin; the least certain pins are listed in VERIFICATION.md.

## Scripts
| Script | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Vite dev server / `tsc --noEmit && vite build` → static `dist/` / serve `dist/` with security headers |
| `npm run typecheck` · `lint` | TypeScript strict · ESLint 9 (flat config, typescript-eslint, react-hooks) |
| `npm test` | Vitest + Testing Library (sniffer, RAW/EPS/RTF parsers, formatters, components, deploy-config drift) |
| `npm run test:e2e` | Playwright against the production build |
| `npm run fixtures` | Regenerates `tests/fixtures/` (needs Pillow, reportlab, pypdf, python-docx, openpyxl, python-pptx, ImageMagick, LibreOffice) |
| `node --experimental-strip-types scripts/verify-fixtures.mjs` | Runs detection + extraction logic against every fixture with plain Node |
| `node --experimental-strip-types scripts/sync-headers.mjs` | Regenerates `vercel.json`, `public/_headers`, `nginx/security-headers.conf` from `config/headers.ts` |

## Supported formats
| Format | Library / approach | Notes |
|---|---|---|
| JPEG, PNG, GIF (animated), WebP, AVIF, BMP | native `<img>` from a Blob URL | zoom, pan, pinch, rotate, fit/fill/100%, checkerboard |
| SVG | DOMPurify → `<img>` from a Blob (never inline) | view-source toggle shows the sanitised markup |
| TIFF/TIF | `utif2` in a Web Worker | multi-page switcher; BigTIFF unsupported |
| HEIC/HEIF | `libheif-js` (WASM bundle) in a Web Worker | multi-image switcher |
| PSD | `ag-psd` (main thread) | composite + read-only layer list; toggling re-composites approximately (no blend modes/masks/effects) |
| RAW (.raw .cr2 .cr3 .nef .nrw .arw .dng .orf .rw2 .raf .pef .srw) | largest **embedded JPEG preview**, found by walking JPEG markers, in a Web Worker | never decodes sensor data; says so when no preview exists. EXIF orientation applied |
| AI | PDF-compatible → `pdfjs-dist`; PostScript-only → EPS pipeline | explanatory message when there is no PDF stream |
| EPS | (1) DOS-EPS TIFF preview (2) `%%BeginPreview` bitmap (3) Ghostscript WASM, optional | no PostScript interpreter ships by default; clear message if all fail |
| PDF | `pdfjs-dist` (local worker) | pages, zoom, thumbnails, selectable text, search, password prompt |
| OBJ(+MTL+textures), GLB, glTF(+bin+textures) | `three` loaders; sidecars resolved through a `LoadingManager` URL modifier | orbit, auto-frame, 3 lighting presets, wireframe, grid/axes, stats; all GPU resources disposed. Draco/KTX2/Meshopt **not** supported |
| DOCX | `docx-preview` | links restricted to http(s)/mailto |
| XLSX/XLS/ODS/CSV | SheetJS (official CDN tarball) | virtualized read-only grid, sheet tabs |
| PPTX | `pptx-preview` | one slide at a time, navigator |
| ODT/ODP/RTF/TXT/MD | `fflate` + DOMParser, own RTF reader | **text only**; Markdown shown as source |
| DOC/PPT (legacy) | not renderable client-side | message + optional LibreOffice converter in `/server` |

Detection is by magic bytes first, then content (ZIP internals), then extension/MIME, so mislabeled files still open. ZIP containers are split into DOCX/XLSX/PPTX/ODT/ODS/ODP by content.

## Architecture
```
src/core/        fileSniffer.ts (pure detection) · registry.ts (kind → lazy viewer) · store.ts (Zustand) · pure parsers: rawPreview, epsPreview, rtf, psdLayers, format
src/viewers/     one lazy-loaded viewer per family; every heavy library is behind React.lazy / import()
src/workers/     tiff, heic, raw decode workers (+ rasterProtocol.ts). Switching files terminates the worker = cancellation
src/components/  Dropzone, Sidebar (lazy thumbnails), Toolbar, MetadataPanel (exifr), HelpOverlay, PanZoom, ErrorBoundary
config/headers.ts  single source of truth for security headers
server/          optional LibreOffice converter (off by default)
```
**Add a format:** add the `FileKind` and detection line in `fileSniffer.ts`, write `src/viewers/MyViewer.tsx`, and register it with one line in `registry.ts`: `{ kinds: ['myfmt'], viewer: lazy(() => import('../viewers/MyViewer')) }`.

**Memory hygiene:** Blob URLs are revoked on file change/unmount, canvases are zeroed, `ImageBitmap`s closed, workers terminated, three.js geometries/materials/textures/renderer/context disposed, pdf.js documents destroyed, PSD layer canvases released.
**Error handling:** an `ErrorBoundary` per file (reset on file change), per-viewer error states, a size-limit warning (default 200 MB, "Open anyway" available; change `maxBytes` in `store.ts`).

## Deployment
All targets serve the same static `dist/` with identical headers (CSP: `default-src 'self'`, `blob:`/`data:` for images, `worker-src 'self' blob:`, `'wasm-unsafe-eval'` for WebAssembly; plus `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) and `application/wasm` for `.wasm`. A unit test fails if the copies drift from `config/headers.ts`.
- **Docker/nginx:** `docker build -t omniview . && docker run -p 8080:80 omniview`
- **Vercel:** import the repo; `vercel.json` sets the build and headers.
- **Netlify:** `netlify.toml` + `public/_headers`.
- **Cloudflare Pages:** build command `npm run build`, output `dist` (`public/_headers` is honoured; `wrangler.toml` for CLI deploys).
- **Any static host:** upload `dist/` and replicate `public/_headers`.

### PWA
`vite-plugin-pwa` generates the service worker (offline app shell; lazily-loaded viewer chunks are precached too) and a manifest with icons and `file_handlers`, so an installed PWA can be chosen as the "Open with" app on Chromium. Ghostscript (`public/gs`) is deliberately excluded from precache.

### Optional legacy Office conversion
See [server/README.md](./server/README.md). Disabled by default; the only path where a file leaves the browser, and only after an explicit click. Build with `VITE_CONVERSION_URL` and add the origin to `connect-src`.

## Known limitations
See [VERIFICATION.md](./VERIFICATION.md#known-limitations).
