import { test, expect, open, hasFixture, expectCanvasRendered } from './helpers'
// No HEIC encoder was available when the fixtures were generated, so this runs only if you add a real tests/fixtures/sample.heic.
test('HEIC/HEIF decodes through the libheif WASM worker', async ({ page }) => {
  test.skip(!hasFixture('sample.heic'), 'tests/fixtures/sample.heic is not present (see scripts/make_fixtures.py)')
  await open(page, 'sample.heic'); await expectCanvasRendered(page, 3); await expect(page.getByRole('alert')).toHaveCount(0)
})
