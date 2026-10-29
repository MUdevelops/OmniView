import { test, expect, open } from './helpers'
const cases: [string, string, string][] = [['TXT', 'sample.txt', 'plain text fixture'], ['Markdown (as source)', 'sample.md', '# Markdown fixture'], ['RTF', 'sample.rtf', 'OmniView Word Fixture'], ['ODT', 'sample.odt', 'OmniView Word Fixture'], ['ODP', 'sample.odp', 'Slide One Title']]
for (const [label, file, text] of cases) test(`${label} shows its text`, async ({ page }) => { await open(page, file); await expect(page.getByTestId('text-view')).toContainText(text) })
