import { describe, it, expect } from 'vitest'
import { baseName } from '../../src/core/sidecars'
describe('baseName', () => {
  it('strips folders, query and case', () => expect(baseName('textures/Wood%20Dark.PNG?x=1')).toBe('wood dark.png'))
  it('handles windows paths', () => expect(baseName('C:\\a\\b.mtl')).toBe('b.mtl'))
})
