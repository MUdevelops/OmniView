import { test, expect, open, distinctColors } from './helpers'
async function expectModel(page: import('@playwright/test').Page) {
  await expect(page.getByLabel('Model statistics')).toContainText('Triangles'); await expect(page.getByLabel('Model statistics')).toContainText('12')
  await expect.poll(async () => distinctColors(page, await page.getByTestId('model-host').screenshot())).toBeGreaterThan(8) // lit, textured cube on a background
}
test('OBJ + MTL + texture dropped together', async ({ page }) => { await open(page, 'cube.obj', 'cube.mtl', 'cube-texture.png'); await expectModel(page); await expect(page.getByLabel('Model statistics')).toContainText('Materials') })
test('GLB with an embedded texture', async ({ page }) => { await open(page, 'cube.glb'); await expectModel(page) })
test('glTF with external .bin and texture', async ({ page }) => { await open(page, 'cube.gltf', 'cube.bin', 'cube-texture.png'); await expectModel(page) })
test('wireframe toggle keeps rendering', async ({ page }) => { await open(page, 'cube.glb'); await expectModel(page); await page.getByRole('button', { name: 'Wireframe' }).click(); await expectModel(page) })
