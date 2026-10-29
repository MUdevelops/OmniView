import { test, expect, open, expectCanvasRendered } from './helpers'
test('multi-page TIFF decodes in a worker and the page switcher works', async ({ page }) => {
  await open(page, 'multipage.tiff'); await expectCanvasRendered(page, 3)
  await expect(page.getByText('Page 1 / 3')).toBeVisible()
  await expect(page.getByTestId('raster-canvas')).toHaveAttribute('width', '160')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Page 2 / 3')).toBeVisible()
  await expect(page.getByTestId('raster-canvas')).toHaveAttribute('width', '200'); await expectCanvasRendered(page, 3)
})
