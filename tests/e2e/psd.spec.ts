import { test, expect, open, expectCanvasRendered } from './helpers'
test('PSD renders its composite and lists layers with visibility toggles', async ({ page }) => {
  await open(page, 'layered.psd'); await expectCanvasRendered(page, 3)
  await expect(page.getByRole('complementary', { name: 'Layers' })).toBeVisible()
  const before = await page.getByTestId('raster-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())
  await page.getByLabel('Show layer Red box').uncheck()
  await expect.poll(() => page.getByTestId('raster-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before)
})
