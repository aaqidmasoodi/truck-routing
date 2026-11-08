import { describe, expect, it } from 'vitest'
import type { Place } from './api/client'
import { checkDraft, emptyDraft, parseWeight, toLocalInput, type TripDraft } from './tripDraft'

const dublin: Place = {
  name: 'Dublin',
  region: 'Leinster',
  country: 'Ireland',
  display_name: 'Dublin, Leinster, Ireland',
  latitude: 53.35,
  longitude: -6.26,
}
const galway: Place = { ...dublin, name: 'Galway', latitude: 53.27, longitude: -9.06 }
const NOW = new Date(2026, 10, 8, 9, 0)
const ready: TripDraft = { ...emptyDraft, origin: dublin, destination: galway, weightText: '36000' }

describe('parseWeight', () => {
  it.each([
    ['36000', 36000],
    ['36,000', 36000],
    ['80000.5', 80000.5],
    ['0', null],
    ['-5', null],
    ['200001', null],
    ['heavy', null],
    ['  ', null],
  ])('reads %j as %j', (text, expected) => {
    expect(parseWeight(text)).toBe(expected)
  })
})

describe('checkDraft', () => {
  it('turns a complete form into a trip', () => {
    const { trip, errors } = checkDraft(ready, NOW)

    expect(errors).toEqual({})
    expect(trip).toEqual({
      origin: dublin,
      destination: galway,
      weightLb: 36000,
      spacingMiles: 25,
    })
  })

  it('keeps quiet about fields that are still empty', () => {
    expect(checkDraft(emptyDraft, NOW)).toEqual({ trip: null, errors: {} })
  })

  it('catches the same place twice', () => {
    const { trip, errors } = checkDraft({ ...ready, destination: dublin }, NOW)

    expect(trip).toBeNull()
    expect(errors.destination).toMatch(/different/)
  })

  it('catches a bad weight', () => {
    expect(checkDraft({ ...ready, weightText: 'lots' }, NOW).errors.weight).toBeDefined()
  })

  it('sends a chosen departure time as UTC', () => {
    const leaveAt = toLocalInput(new Date(2026, 10, 8, 14, 30))

    const { trip } = checkDraft({ ...ready, leaveAt }, NOW)

    expect(trip?.departure).toBe(new Date(2026, 10, 8, 14, 30).toISOString())
  })

  it.each([
    [new Date(2026, 10, 8, 7, 0), 'already passed'],
    [new Date(2026, 10, 10, 10, 0), 'within the next 48 hours'],
  ])('rejects a departure at %s', (when, message) => {
    const { trip, errors } = checkDraft({ ...ready, leaveAt: toLocalInput(when) }, NOW)

    expect(trip).toBeNull()
    expect(errors.leaveAt).toContain(message)
  })

  it('allows a time picked a moment ago', () => {
    const leaveAt = toLocalInput(new Date(2026, 10, 8, 8, 58))

    expect(checkDraft({ ...ready, leaveAt }, NOW).trip).not.toBeNull()
  })
})

describe('toLocalInput', () => {
  it('formats local time the way datetime-local inputs expect', () => {
    expect(toLocalInput(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03')
  })
})
