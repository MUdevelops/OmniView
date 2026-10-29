import { test, open, expectImageLoaded } from './helpers'
const cases: [string, string, number][] = [['JPEG', 'sample.jpg', 320], ['PNG (transparent)', 'transparent.png', 200], ['GIF (animated)', 'animated.gif', 120], ['WebP', 'sample.webp', 256], ['AVIF', 'sample.avif', 256], ['BMP', 'sample.bmp', 200]]
for (const [label, file, width] of cases) test(`${label} renders through <img> with its real width`, async ({ page }) => { await open(page, file); await expectImageLoaded(page, width) })
