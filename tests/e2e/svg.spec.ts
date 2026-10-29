import { test, expect, open, expectImageLoaded } from './helpers'
test('SVG renders and has a view-source toggle', async ({ page }) => {
  await open(page, 'sample.svg'); await expectImageLoaded(page, 240)
  await page.getByRole('button', { name: 'View source' }).click()
  await expect(page.getByTestId('svg-source')).toContainText('<svg')
})
test('SVG with <script> and onload is sanitised and never executes', async ({ page }) => {
  await open(page, 'evil.svg'); await expectImageLoaded(page, 1)
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
  await page.getByRole('button', { name: 'View source' }).click()
  const src = (await page.getByTestId('svg-source').textContent()) ?? ''
  expect(src).not.toMatch(/<script|onload/i)
})
