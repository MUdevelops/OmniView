import { test, expect, open } from './helpers'
test('PDF shows page count, searches text and navigates', async ({ page }) => {
  await open(page, 'multipage.pdf')
  await expect(page.getByTestId('pdf-page-count')).toHaveText('Page 1 of 3')
  await page.getByLabel('Search text').fill('needle'); await page.getByRole('button', { name: 'Find' }).click()
  await expect(page.getByText('Found on 1 page')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click(); await expect(page.getByTestId('pdf-page-count')).toHaveText('Page 2 of 3')
})
test('password-protected PDF asks for a password and rejects a wrong one', async ({ page }) => {
  await open(page, 'encrypted.pdf')
  await expect(page.getByText('This PDF is password protected')).toBeVisible()
  await page.getByLabel('This PDF is password protected').fill('nope'); await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByRole('alert')).toContainText('not correct')
  await page.getByLabel('This PDF is password protected').fill('secret'); await page.getByRole('button', { name: 'Unlock' }).click()
  await expect(page.getByTestId('pdf-page-count')).toHaveText('Page 1 of 2')
})
test('AI (PDF-compatible Illustrator file) renders through pdf.js', async ({ page }) => {
  await open(page, 'vector.ai'); await expect(page.getByTestId('pdf-page-count')).toHaveText('Page 1 of 3')
})
