import { describe, expect, it, vi } from 'vitest'
import { planTrip, searchPlaces } from './client'

describe('searchPlaces', () => {
  it('asks the API for places matching the query', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))

    await searchPlaces('St. Louis')

    expect(fetch).toHaveBeenCalledWith('/api/places/?q=St.+Louis', {})
  })

  it('throws when the API returns an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 502 }))

    await expect(searchPlaces('Denver')).rejects.toThrow('API error 502')
  })
})

describe('planTrip', () => {
  it('posts the trip in the shape the API expects', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

    await planTrip({
      origin: { latitude: 53.35, longitude: -6.26 },
      destination: { latitude: 53.27, longitude: -9.06 },
      weightLb: 36000,
      spacingMiles: 10,
    })

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('/api/plan/')
    expect(JSON.parse(String(init?.body))).toEqual({
      origin: { latitude: 53.35, longitude: -6.26 },
      destination: { latitude: 53.27, longitude: -9.06 },
      weight_lb: 36000,
      spacing_miles: 10,
    })
  })
})
