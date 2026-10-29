import { test, expect } from './helpers'
test('production build ships security headers, a manifest with file_handlers, and registers a service worker', async ({ page, request }) => {
  const res = await page.goto('/'); const h = res!.headers()
  expect(h['content-security-policy']).toContain("worker-src 'self' blob:"); expect(h['x-content-type-options']).toBe('nosniff'); expect(h['referrer-policy']).toBe('no-referrer')
  const m = await (await request.get('/manifest.webmanifest')).json()
  expect(m.name).toBe('OmniView'); expect(m.file_handlers?.[0]?.accept?.['application/pdf']).toContain('.pdf'); expect(m.icons.length).toBeGreaterThanOrEqual(2)
  for (const i of m.icons) expect((await request.get('/' + i.src)).ok()).toBe(true)
  expect(await page.evaluate(() => navigator.serviceWorker.ready.then(() => true))).toBe(true)
})
