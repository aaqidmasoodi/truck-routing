import { describe, expect, it } from 'vitest'
import { formatDuration, formatMiles } from './format'

describe('formatMiles', () => {
  it('rounds and groups thousands', () => {
    expect(formatMiles(1003.6)).toBe('1,004 mi')
  })
})

describe('formatDuration', () => {
  it.each([
    [42.4, '42 min'],
    [60, '1 h'],
    [905.5, '15 h 6 min'],
    [59.6, '1 h'],
  ])('formats %s minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})
