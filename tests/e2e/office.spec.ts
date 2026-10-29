import { test, expect, open } from './helpers'
test('DOCX renders text and tables', async ({ page }) => {
  await open(page, 'sample.docx'); const host = page.getByTestId('docx-host')
  await expect(host).toContainText('OmniView Word Fixture'); await expect(host).toContainText('Cell B2')
})
test('DOCX is recognised by content even when named .txt', async ({ page }) => { await open(page, 'mislabeled-docx.txt'); await expect(page.getByTestId('docx-host')).toContainText('OmniView Word Fixture') })
test('XLSX shows a virtualized table with a sheet switcher', async ({ page }) => {
  await open(page, 'sample.xlsx')
  await expect(page.getByRole('cell', { name: 'row-1', exact: true })).toBeVisible()
  expect(await page.getByRole('row').count()).toBeLessThan(80) // 301 data rows, only the visible window is in the DOM
  await page.getByRole('tab', { name: 'Second' }).click(); await expect(page.getByRole('cell', { name: 'Hello Sheet' })).toBeVisible()
})
test('CSV renders as a table', async ({ page }) => { await open(page, 'sample.csv'); await expect(page.getByRole('cell', { name: 'New York' })).toBeVisible() })
test('ODS renders as a table', async ({ page }) => { await open(page, 'sample.ods'); await expect(page.getByRole('cell', { name: 'row-1', exact: true })).toBeVisible() })
test('legacy XLS renders as a table', async ({ page }) => { await open(page, 'sample.xls'); await expect(page.getByRole('cell', { name: 'row-1', exact: true })).toBeVisible() })
test('PPTX renders slides with a navigator', async ({ page }) => {
  await open(page, 'sample.pptx'); await expect(page.getByTestId('slide-count')).toHaveText('3')
  await expect(page.getByTestId('pptx-host')).toContainText('Slide One Title')
  await page.getByRole('button', { name: 'Next slide' }).click(); await expect(page.getByTestId('pptx-host').getByText('Slide Two Title')).toBeVisible()
})
