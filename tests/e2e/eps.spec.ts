import { test, expect, open, expectCanvasRendered } from './helpers'
test('EPS with a %%BeginPreview bitmap shows that preview', async ({ page }) => {
  await open(page, 'preview.eps'); await expect(page.getByTestId('eps-notice')).toContainText('bitmap preview'); await expectCanvasRendered(page, 8)
})
test('EPS with a DOS binary header shows its embedded TIFF preview', async ({ page }) => {
  await open(page, 'dos-tiff-preview.eps'); await expect(page.getByTestId('eps-notice')).toContainText('TIFF preview'); await expectCanvasRendered(page, 8)
})
test('EPS with no preview ends in a clear message (or renders, if the optional Ghostscript converter is installed)', async ({ page }) => {
  await open(page, 'nopreview.eps')
  await expect(page.getByRole('alert').or(page.getByTestId('eps-notice'))).toBeVisible({ timeout: 100_000 })
})
test('PostScript-based .ai without a PDF stream explains why it cannot be shown', async ({ page }) => {
  await open(page, 'postscript.ai')
  await expect(page.getByRole('alert').or(page.getByTestId('eps-notice'))).toBeVisible({ timeout: 100_000 })
  if (await page.getByRole('alert').count()) await expect(page.getByRole('alert')).toContainText('no PDF stream')
})
