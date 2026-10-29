# OmniView converter (optional)

Browsers cannot render legacy binary `.doc` / `.ppt` reliably. This tiny service converts them to PDF with LibreOffice so OmniView can display the result.

**It is the only part of the project that receives files, so it is off by default.**
When enabled, a file is uploaded only after the user clicks "Convert on server" and reads the on-screen notice.

## Enable
1. Run it: `docker compose up --build` (compose file sets `ENABLE_CONVERSION=true`). Without that variable every endpoint except `/healthz` answers `503`.
2. Build OmniView with `VITE_CONVERSION_URL=http://localhost:8080 npm run build` (without it the button never appears).
3. Allow the browser to call it: put the converter's origin in `connect-src` in `config/headers.ts`, `nginx.conf`, `vercel.json` and `public/_headers`, and set `ALLOWED_ORIGIN` to your OmniView origin.

## API
`POST /convert?filename=report.doc` with the raw bytes as body → `200 application/pdf`.
Errors: `400` empty, `413` too large, `415` unsupported extension, `429` busy, `503` disabled, `504` timeout.

## Environment
| Variable | Default | Meaning |
|---|---|---|
| `ENABLE_CONVERSION` | `false` | master switch |
| `ALLOWED_ORIGIN` | _(none)_ | CORS origin; empty = same-origin only |
| `MAX_UPLOAD_MB` | `50` | request size cap |
| `CONVERT_TIMEOUT_S` | `60` | per-file timeout (process is killed) |
| `MAX_CONCURRENT` | `2` | simultaneous conversions |
| `PORT` | `8080` | listen port |

## Safety notes
Files are written to a per-request temp dir under a server-generated name, converted, returned and deleted. The container runs as non-root with a read-only root FS in the compose file. Put it behind your own auth/rate-limiting before exposing it publicly: LibreOffice parsing untrusted files is a real attack surface.
