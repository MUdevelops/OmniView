import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { SECURITY_HEADERS } from './config/headers'

const exts = {
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg', '.tif', '.tiff', '.heic', '.heif', '.psd'],
  'application/pdf': ['.pdf', '.ai'],
  'application/postscript': ['.eps'],
  'model/gltf-binary': ['.glb'], 'model/gltf+json': ['.gltf'], 'model/obj': ['.obj'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.oasis.opendocument.text': ['.odt'], 'application/vnd.oasis.opendocument.spreadsheet': ['.ods'], 'application/vnd.oasis.opendocument.presentation': ['.odp'],
  'text/csv': ['.csv'], 'text/plain': ['.txt', '.md'], 'application/rtf': ['.rtf'],
}
const manifest = {
  name: 'OmniView', short_name: 'OmniView', description: 'View-only universal file viewer. Files are processed locally and never uploaded.',
  start_url: '/', scope: '/', display: 'standalone', background_color: '#16181c', theme_color: '#1f5eff',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  file_handlers: [{ action: '/', accept: exts }],
}

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.VITEST ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: manifest as never, // file_handlers is not in the plugin's manifest typings
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm}'],
        globIgnores: ['gs/**'],                       // optional Ghostscript is not precached (large)
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024, // libheif / pdf.js bundles are several MB
        navigateFallback: 'index.html',
      },
    })]),
  ],
  worker: { format: 'es' },
  preview: { headers: SECURITY_HEADERS },
  test: { environment: 'node', include: ['tests/unit/**/*.test.{ts,tsx}'], setupFiles: ['tests/setup.ts'] },
})
