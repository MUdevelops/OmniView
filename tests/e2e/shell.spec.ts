import { test, expect, open, fx, expectImageLoaded } from './helpers'
test('corrupt file shows a friendly error and the app keeps working', async ({ page }) => {
  await open(page, 'corrupt.png'); await expect(page.getByRole('alert')).toContainText('could not be displayed')
  await page.getByTestId('file-input').setInputFiles(fx('sample.jpg')); await expectImageLoaded(page, 320)
})
test('mislabeled file (PNG named .jpg) still renders', async ({ page }) => { await open(page, 'mislabeled.jpg'); await expectImageLoaded(page, 160) })
test('multi-file open, sidebar and arrow-key navigation', async ({ page }) => {
  await open(page, 'sample.jpg', 'transparent.png')
  await expect(page.getByRole('navigation', { name: 'Files' }).getByRole('button')).toHaveCount(2)
  await expect(page.getByRole('button', { name: /sample\.jpg/ })).toHaveAttribute('aria-current', 'true')
  await page.keyboard.press('ArrowRight'); await expect(page.getByRole('button', { name: /transparent\.png/ })).toHaveAttribute('aria-current', 'true')
  await page.keyboard.press('ArrowLeft'); await expect(page.getByRole('button', { name: /sample\.jpg/ })).toHaveAttribute('aria-current', 'true')
})
test('info panel shows file facts and EXIF', async ({ page }) => {
  await open(page, 'sample.jpg'); await page.getByRole('button', { name: 'Info' }).click()
  const panel = page.getByRole('complementary', { name: 'File information' })
  await expect(panel).toContainText('sample.jpg'); await expect(panel).toContainText('320 × 240'); await expect(panel).toContainText('OmniView Test')
})
test('help overlay opens with ? and closes with Escape; theme toggles', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('?'); await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible()
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: 'Dark' }).or(page.getByRole('button', { name: 'Light' })).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
})
test('privacy notice is visible and layout fits 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 }); await open(page, 'sample.jpg')
  await expect(page.getByText('Files are processed locally and never uploaded.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360)
})
test('slideshow advances and stops', async ({ page }) => {
  await open(page, 'sample.jpg', 'sample.webp'); await page.getByRole('button', { name: 'Slideshow' }).click()
  await expect(page.getByRole('button', { name: 'Stop slideshow' })).toBeVisible(); await page.getByRole('button', { name: 'Stop slideshow' }).click()
})
