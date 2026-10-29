import { test, expect, open } from './helpers'
for (const f of ['sample.doc', 'sample.ppt']) test(`legacy ${f} gets a clear message and no silent failure`, async ({ page }) => {
  await open(page, f)
  await expect(page.getByRole('status')).toContainText('legacy binary Office file')
  await expect(page.getByText('Server-side conversion is not enabled')).toBeVisible() // default build: converter is opt-in
})
