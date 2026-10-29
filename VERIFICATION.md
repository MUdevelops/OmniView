# VERIFICATION

Written honestly. **Nothing here is marked PASS unless it was actually executed.** The authoring sandbox had **no network**, so `npm install`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (Vitest) and `npm run test:e2e` (Playwright) could **not** be run. Rendering in a real browser was therefore never observed.

## What was actually run

| # | Check | Result |
|---|---|---|
| 1 | `scripts/make_fixtures.py` generated 41 fixtures | ran, OK |
| 2 | Fixtures independently validated with Pillow, pypdf, `zipfile`, ImageMagick (valid images, 3-frame GIF/TIFF, GLB header/chunk lengths and embedded PNG, `.bin` length, OBJ→MTL→texture refs, PDF page counts, encrypted PDF wrong/right password, OOXML/ODF zip members, OLE headers on `.doc/.ppt/.xls`, `corrupt.png` really fails to decode) | 0 problems |
| 3 | `scripts/verify-fixtures.mjs` (plain Node, runs the app's own `fileSniffer`, `rawPreview`, `epsPreview`, `rtf` modules on every fixture) | **PASS 47 / 47** |
| 4 | RAW preview bytes extracted by `rawPreview.ts` re-opened with Pillow | valid 1200×800 JPEG |
| 5 | The same assertions as `tests/unit/*.test.ts` for sniffer/RAW/EPS/RTF/format/psdLayers, executed as a plain Node script | PASS (Vitest itself not run) |
| 6 | `/server` converter run live with LibreOffice 24.2: `.doc`→PDF (1 page, correct text), `.ppt`→PDF (3 pages), `415` bad extension, `400` empty body, `503` when `ENABLE_CONVERSION` unset, `/healthz` | PASS |
| 7 | `sync-headers.mjs` output compared with `config/headers.ts` (same logic as `deployConfig.test.ts`) | PASS |
| 8 | Partial `tsc --noEmit` with packages absent (global `tsc` 6.0.3, not the pinned 5.6.2) | no errors other than "cannot find module/types" cascades |

## Per-format table

"Detect" = magic-byte/extension logic run in Node against the fixture. "Render" = displayed by the real viewer in a browser; **NOT RUN everywhere** because no browser pipeline could be run. A Playwright test exists for every row (tests/e2e/), written but unexecuted.

| Format | Library | Fixture | Detect (run) | Render / e2e | Notes |
|---|---|---|---|---|---|
| JPEG (+EXIF) | native `<img>`, exifr | sample.jpg | PASS | NOT RUN | EXIF Make/Model/Date written with Pillow |
| PNG (transparent) | native | transparent.png | PASS | NOT RUN | alpha confirmed with Pillow |
| GIF animated | native | animated.gif | PASS | NOT RUN | 3 frames confirmed |
| WebP | native | sample.webp | PASS | NOT RUN | |
| AVIF | native | sample.avif | PASS | NOT RUN | needs AVIF-capable browser |
| BMP | native | sample.bmp | PASS | NOT RUN | |
| SVG | DOMPurify → `<img>` | sample.svg, evil.svg | PASS | NOT RUN | e2e asserts the script never runs (`window.__pwned`) |
| TIFF multi-page | utif2 (worker) | multipage.tiff | PASS | NOT RUN | 3 pages, different sizes |
| HEIC/HEIF | libheif-js (worker) | **none** | n/a (unit-tested on synthetic `ftyp` bytes only) | **NOT RUN, no fixture** | no HEVC encoder in the sandbox; drop a real `tests/fixtures/sample.heic` in to enable `heic.spec.ts` |
| PSD (layers) | ag-psd | layered.psd | PASS | NOT RUN | made by ImageMagick, 8-bit, 2 named layers + composite |
| RAW | embedded-JPEG extraction | photo.dng, photo-nopreview.dng | PASS (+ extraction PASS) | NOT RUN | **synthetic** TIFF container with embedded JPEGs and orientation 6, not camera output. No real CR2/NEF/ARW/ORF/RW2/CR3 was tested |
| AI (PDF-compatible) | pdfjs-dist | vector.ai | PASS (→pdf) | NOT RUN | |
| AI (PostScript only) | message | postscript.ai | PASS | NOT RUN | |
| EPS ASCII preview | own parser | preview.eps | PASS (+ parse PASS) | NOT RUN | bitmap polarity (0 = black) follows my reading of the spec; not checked against an Adobe-written file |
| EPS DOS-binary TIFF preview | header parser + utif2 | dos-tiff-preview.eps | PASS (+ header PASS) | NOT RUN | |
| EPS without preview | Ghostscript WASM (optional) | nopreview.eps | PASS | NOT RUN | Ghostscript step is **unverified code** (see below) |
| PDF multi-page + search | pdfjs-dist | multipage.pdf | PASS | NOT RUN | |
| PDF password | pdfjs-dist | encrypted.pdf | PASS | NOT RUN | password `secret`, verified with pypdf |
| OBJ + MTL + texture | three | cube.obj/.mtl/cube-texture.png | PASS | NOT RUN | |
| GLB with texture | three GLTFLoader | cube.glb | PASS | NOT RUN | structure validated by script |
| glTF + .bin + texture | three GLTFLoader | cube.gltf/.bin | PASS | NOT RUN | |
| DOCX | docx-preview | sample.docx (+ mislabeled-docx.txt) | PASS | NOT RUN | |
| XLSX / XLS / ODS | SheetJS | sample.xlsx/.xls/.ods | PASS | NOT RUN | 301 rows, 2 sheets; XLS/ODS made by LibreOffice |
| CSV | SheetJS | sample.csv | PASS | NOT RUN | |
| PPTX | pptx-preview | sample.pptx | PASS | NOT RUN | slide-extraction relies on DOM structure guess (see below) |
| ODT / ODP / RTF | fflate + DOMParser / own RTF | sample.odt/.odp/.rtf | PASS (+ RTF text PASS) | NOT RUN | text only |
| TXT / MD | plain text | sample.txt/.md | PASS | NOT RUN | |
| DOC / PPT legacy | message (+ optional server) | sample.doc/.ppt | PASS | NOT RUN | server conversion itself PASS (run 6) |
| Corrupt file | error handling | corrupt.png | PASS (kind png) | NOT RUN | expects friendly alert, app stays usable |
| Mislabeled extension | magic wins | mislabeled.jpg (PNG), mislabeled-docx.txt | PASS | NOT RUN | |

## Pipeline status

| Step | Status |
|---|---|
| `npm install` | NOT RUN |
| `npm run build` | NOT RUN |
| `npm run lint` | NOT RUN |
| `npm run typecheck` | NOT RUN (partial check only, see run 8) |
| `npm test` | NOT RUN (equivalent logic run under Node, see run 5) |
| `npm run test:e2e` | NOT RUN |

## Assumptions that could not be verified (most likely first-run failures)
- **Versions pinned from memory** (no registry access): least certain are `ag-psd@28.2.0`, `pptx-preview@1.0.5`, `libheif-js@1.18.2`, `@jspawn/ghostscript-wasm@0.0.2` (optional dependency), `utif2@4.1.0`. The SheetJS tarball URL `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` should be confirmed on cdn.sheetjs.com.
- `libheif-js/wasm-bundle` import path and default export shape (worker `heic.worker.ts`; typings in `src/types/shims.d.ts`).
- `pptx-preview`: the viewer shows one slide by locating the wrapper element that holds the slides (largest child count). If the library's DOM differs, the viewer reports "No slides were found".
- `ag-psd`: assumes `layer.opacity` is 0..1, `hidden`, `children`, `canvas`, `left/top` as documented.
- `docx-preview` option names; `exifr` default import exposing `parse` and `orientation`.
- Ghostscript fallback (`public/gs/runner.js`): written from Emscripten conventions, never run; failures surface as the normal "cannot be shown" message.
- `vite-plugin-pwa` accepting `file_handlers` in the manifest (cast with `as never`).
- CSP may block something I did not foresee (the e2e suite fails any test on a CSP violation, which is how it would show up).

## Known limitations
- **HEIC** untested (no fixture); **RAW** is preview-only and only tested on a synthetic file; a RAW with no embedded JPEG shows "Cannot render this RAW file".
- **EPS/AI**: no PostScript interpreter by default. Vector artwork is not drawn; embedded previews only, plus Ghostscript if installed and working. WMF-only previews unsupported.
- **PSD**: main-thread parse (large files can freeze the tab briefly and cannot be cancelled); layer toggles ignore blend modes/masks/effects.
- **3D**: Draco, KTX2 and Meshopt-compressed glTF are not supported. Sidecar `.mtl`/`.bin` show as dimmed "sidecar" entries.
- **Office**: DOCX/PPTX/XLSX fidelity is library-limited (complex layouts, charts, SmartArt, macros). ODT/ODP/RTF are text only; Markdown is shown as source. Legacy **.doc/.ppt cannot be rendered client-side**; XLS works via SheetJS. XLSX parsing is on the main thread. Very large sheets are capped at 256 columns.
- **Thumbnails** exist only for natively decodable images; other types show a type badge.
- **PDF** search lists matching pages and jumps to them; it does not highlight hits and cannot be cancelled midway.
- **Pinch zoom** and fullscreen are implemented but touch behaviour is untested on real devices.
- Fonts: no web fonts are bundled; the UI uses the system font stack.
- WebP/AVIF/HEIC availability depends on the browser's codecs (native formats).
