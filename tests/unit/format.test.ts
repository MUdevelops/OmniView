import { describe, it, expect } from 'vitest'
import { formatBytes, formatValue, toRows } from '../../src/core/format'
describe('formatBytes', () => {
  it('formats units', () => {
    expect(formatBytes(0)).toBe('0 B'); expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1536)).toBe('1.5 KB'); expect(formatBytes(1048576)).toBe('1.0 MB'); expect(formatBytes(150 * 1024)).toBe('150 KB')
  })
})
describe('formatValue', () => {
  it('handles dates, binary, arrays, empties and long strings', () => {
    expect(formatValue(new Date('2024-01-02T03:04:05Z'))).toBe('2024-01-02T03:04:05.000Z')
    expect(formatValue(new Uint8Array(5))).toBe('[5 bytes]')
    expect(formatValue([1, 2, 3])).toBe('1, 2, 3')
    expect(formatValue(null)).toBe(''); expect(formatValue(new Date('x'))).toBe('')
    expect(formatValue('a'.repeat(300)).length).toBe(201)
  })
})
describe('toRows', () => {
  it('sorts keys and drops empty values', () => {
    expect(toRows({ b: 2, a: 'x', c: '', d: undefined })).toEqual([['a', 'x'], ['b', '2']])
    expect(toRows(undefined)).toEqual([])
  })
})
