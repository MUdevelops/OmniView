import { test, expect, open, expectImageLoaded } from './helpers'
test('RAW shows the embedded full-size JPEG preview, rotated by EXIF orientation', async ({ page }) => {
  await open(page, 'photo.dng'); await expectImageLoaded(page, 1200)
  await expect(page.getByTestId('raw-notice')).toContainText('1200 × 800')
  await expect(page.getByTestId('viewer-image')).toHaveCSS('transform', /matrix/) // orientation 6 => initial 90° rotation
})
test('RAW without a usable preview says so instead of failing silently', async ({ page }) => {
  await open(page, 'photo-nopreview.dng')
  await expect(page.getByRole('alert')).toContainText('Cannot render this RAW file')
})
