import { describe, expect, it } from 'vitest'
import { formatArrival, formatDuration, formatMiles } from './format'

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

describe('formatArrival', () => {
  const leaving = '2026-11-09T08:00:00Z'

  it('shows just the time on the day you leave', () => {
    expect(formatArrival('2026-11-09T10:45:00Z', leaving, 'UTC')).toBe('10:45 AM')
  })

  it('adds the weekday once the trip runs into the next day', () => {
    expect(formatArrival('2026-11-10T01:15:00Z', leaving, 'UTC')).toBe('Tue 1:15 AM')
  })
})
