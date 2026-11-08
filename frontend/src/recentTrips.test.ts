import { describe, expect, it, vi } from 'vitest'
import type { Place } from './api/client'
import { loadRecentTrips, MAX_RECENT, recentPlaces, rememberTrip, tripLabel } from './recentTrips'

function place(name: string, latitude: number, longitude = 0): Place {
  return { name, region: '', country: '', display_name: name, latitude, longitude }
}

const DENVER = place('Denver', 39.74, -104.98)
const CHICAGO = place('Chicago', 41.88, -87.63)
const DALLAS = place('Dallas', 32.78, -96.8)

describe('recent trips', () => {
  it('starts empty', () => {
    expect(loadRecentTrips()).toEqual([])
  })

  it('remembers a trip across page loads', () => {
    rememberTrip([], { origin: DENVER, destination: CHICAGO })

    expect(loadRecentTrips()).toEqual([{ origin: DENVER, destination: CHICAGO }])
  })

  it('puts the newest first and moves a repeat to the front instead of copying it', () => {
    let trips = rememberTrip([], { origin: DENVER, destination: CHICAGO })
    trips = rememberTrip(trips, { origin: DALLAS, destination: CHICAGO })
    trips = rememberTrip(trips, { origin: DENVER, destination: CHICAGO })

    expect(trips.map((t) => t.origin.name)).toEqual(['Denver', 'Dallas'])
  })

  it('keeps the trip and its reverse apart', () => {
    let trips = rememberTrip([], { origin: DENVER, destination: CHICAGO })
    trips = rememberTrip(trips, { origin: CHICAGO, destination: DENVER })

    expect(trips).toHaveLength(2)
  })

  it(`keeps only the last ${MAX_RECENT}`, () => {
    let trips = loadRecentTrips()
    for (let i = 0; i < 8; i++) {
      trips = rememberTrip(trips, { origin: place(`Start ${i}`, i), destination: CHICAGO })
    }

    expect(loadRecentTrips()).toHaveLength(MAX_RECENT)
    expect(loadRecentTrips()[0]?.origin.name).toBe('Start 7')
  })

  it('ignores broken or tampered data', () => {
    localStorage.setItem('truck-routing:recent-trips', '{not json')
    expect(loadRecentTrips()).toEqual([])

    localStorage.setItem(
      'truck-routing:recent-trips',
      JSON.stringify([{ origin: DENVER, destination: { name: 'x' } }, 'junk', null]),
    )
    expect(loadRecentTrips()).toEqual([])
  })

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(loadRecentTrips()).toEqual([])
    expect(rememberTrip([], { origin: DENVER, destination: CHICAGO })).toHaveLength(1)
  })

  it('lists each recent place once, newest first', () => {
    const trips = [
      { origin: DALLAS, destination: CHICAGO },
      { origin: DENVER, destination: CHICAGO },
    ]

    expect(recentPlaces(trips).map((p) => p.name)).toEqual(['Dallas', 'Chicago', 'Denver'])
  })
})

describe('trip labels', () => {
  const SRINAGAR_JK = { ...place('Srinagar', 34.09, 74.81), region: 'Jammu and Kashmir' }
  const SRINAGAR_UK = { ...place('Srīnagar', 30.22, 78.78), region: 'Uttarakhand' }
  const MUMBAI = place('Mumbai', 19.07, 72.88)

  it('uses short names when they are unique', () => {
    const trips = [{ origin: DENVER, destination: CHICAGO }]

    expect(tripLabel(trips[0]!, trips)).toBe('Denver → Chicago')
  })

  it('adds the region when two recent places share a name', () => {
    const trips = [
      { origin: MUMBAI, destination: SRINAGAR_UK },
      { origin: MUMBAI, destination: SRINAGAR_JK },
    ]

    expect(trips.map((t) => tripLabel(t, trips))).toEqual([
      'Mumbai → Srīnagar, Uttarakhand',
      'Mumbai → Srinagar, Jammu and Kashmir',
    ])
  })
})
