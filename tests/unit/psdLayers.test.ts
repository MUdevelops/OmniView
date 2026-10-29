import { describe, it, expect } from 'vitest'
import { flattenLayers } from '../../src/core/psdLayers'
describe('flattenLayers', () => {
  it('lists top-most first with index-path ids, depth and groups', () => {
    const rows = flattenLayers([{ name: 'bg' }, { name: 'group', children: [{ name: 'a' }, { name: 'b', hidden: true }] }, { name: '' }])
    expect(rows.map((r) => [r.id, r.name, r.depth, r.isGroup, r.hidden])).toEqual([
      ['2', '(unnamed)', 0, false, false], ['1', 'group', 0, true, false],
      ['1.1', 'b', 1, false, true], ['1.0', 'a', 1, false, false], ['0', 'bg', 0, false, false]])
  })
  it('handles undefined', () => expect(flattenLayers(undefined)).toEqual([]))
})
