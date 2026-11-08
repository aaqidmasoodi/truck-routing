import { describe, expect, it } from 'vitest'
import type { Place } from './api/client'
import { emptyDraft } from './tripDraft'
import { draftFromSearch, tripSearch } from './tripLink'

const DENVER: Place = {
  name: 'Denver',
  region: 'Colorado',
  country: 'United States',
  display_name: 'Denver, Colorado, United States',
  latitude: 39.73915,
  longitude: -104.9847,
}
const CHICAGO: Place = {
  ...DENVER,
  name: 'Chicago',
  display_name: 'Chicago',
  latitude: 41.88,
  longitude: -87.63,
}

describe('trip links', () => {
  it('round-trips a trip through the page address', () => {
    const draft = {
      ...emptyDraft,
      origin: DENVER,
      destination: CHICAGO,
      weightText: '42,000',
      spacing: 10 as const,
      leaveAt: '2026-11-09T06:30',
    }

    const back = draftFromSearch(tripSearch(draft))

    expect(back?.origin).toMatchObject({
      name: 'Denver',
      display_name: DENVER.display_name,
      latitude: 39.73915,
    })
    expect(back?.destination?.longitude).toBe(-87.63)
    expect(back?.weightText).toBe('42000')
    expect(back?.spacing).toBe(10)
    expect(back?.leaveAt).toBe('2026-11-09T06:30')
  })

  it('has no link until both ends are chosen', () => {
    expect(tripSearch({ ...emptyDraft, origin: DENVER })).toBe('')
  })

  it.each([
    '',
    '?from=39,-104',
    '?from=abc&to=41,-87',
    '?from=95,0&to=41,-87',
    '?from=39,-200&to=41,-87',
  ])('ignores a link without two real places: %s', (search) => {
    expect(draftFromSearch(search)).toBeNull()
  })

  it('falls back to the defaults for anything odd', () => {
    const draft = draftFromSearch('?from=39,-104&to=41,-87&every=15')

    expect(draft?.spacing).toBe(25)
    expect(draft?.weightText).toBe(emptyDraft.weightText)
    expect(draft?.origin?.display_name).toBe('39, -104')
  })
})
