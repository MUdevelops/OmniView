import { test as base, expect, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const fx = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url))
export const hasFixture = (name: string) => existsSync(fx(name))

/** Every test also fails on an uncaught page error or a Content-Security-Policy violation. */
export const test = base.extend<{ problems: string[] }>({
  problems: [async ({ page }, use) => {
    const problems: string[] = []
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('console', (m) => { if (m.type() === 'error' && /Content Security Policy|violates the following/i.test(m.text())) problems.push(`csp: ${m.text()}`) })
    await use(problems)
    expect(problems, 'uncaught errors / CSP violations').toEqual([])
  }, { auto: true }],
})
export { expect }

/** Load one or more fixtures through the real file input (same path as "Open files"). */
export async function open(page: Page, ...names: string[]) {
  await page.goto('/')
  await page.getByTestId('file-input').setInputFiles(names.map(fx))
}
/** Number of distinct colours in an image buffer, decoded in the page. Used to prove a canvas/screenshot is not blank. */
export async function distinctColors(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data; const seen = new Set<number>()
    for (let i = 0; i < d.length; i += 4) { seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (seen.size > 64) break }
    return seen.size
  }, png.toString('base64'))
}
/** Wait until the decoded-image canvas has real, non-uniform pixels. */
export async function expectCanvasRendered(page: Page, minColors = 2) {
  await expect.poll(() => page.getByTestId('raster-canvas').evaluate((c: HTMLCanvasElement) => {
    if (!c.width || !c.height) return 0
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data; const seen = new Set<number>()
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) seen.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]); if (seen.size >= minColors) break }
    return seen.size
  })).toBeGreaterThanOrEqual(minColors)
}
export async function expectImageLoaded(page: Page, minWidth = 1) {
  await expect.poll(() => page.getByTestId('viewer-image').evaluate((i: HTMLImageElement) => i.complete ? i.naturalWidth : 0)).toBeGreaterThanOrEqual(minWidth)
}
