import { describe, expect, it, vi } from 'vitest'
import { ApiError, planTrip, retrying, searchPlaces } from './client'

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

describe('planTrip departure', () => {
  const trip = {
    origin: { latitude: 53.35, longitude: -6.26 },
    destination: { latitude: 53.27, longitude: -9.06 },
    weightLb: 36000,
    spacingMiles: 25 as const,
  }

  it('sends the departure time when one is set', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

    await planTrip({ ...trip, departure: '2026-11-09T06:30:00.000Z' })

    const [, init] = fetch.mock.calls[0] ?? []
    expect(JSON.parse(String(init?.body)).departure).toBe('2026-11-09T06:30:00.000Z')
  })

  it('leaves departure out to mean now', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({}))

    await planTrip(trip)

    const [, init] = fetch.mock.calls[0] ?? []
    expect(JSON.parse(String(init?.body))).not.toHaveProperty('departure')
  })
})

describe('retrying', () => {
  const quick = { waitMs: 0 }

  it('tries again when the server is briefly unavailable', async () => {
    const attempt = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(502, 'down'))
      .mockResolvedValueOnce('ok')

    await expect(retrying(attempt, quick)).resolves.toBe('ok')
    expect(attempt).toHaveBeenCalledTimes(2)
  })

  it('gives up after three tries', async () => {
    const attempt = vi.fn<() => Promise<string>>().mockRejectedValue(new ApiError(502, 'down'))

    await expect(retrying(attempt, quick)).rejects.toThrow('down')
    expect(attempt).toHaveBeenCalledTimes(3)
  })

  it('does not retry answers that will not change, like no route', async () => {
    const attempt = vi.fn<() => Promise<string>>().mockRejectedValue(new ApiError(404, 'no road'))

    await expect(retrying(attempt, quick)).rejects.toThrow('no road')
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('retries when the network itself fails', async () => {
    const attempt = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok')

    await expect(retrying(attempt, quick)).resolves.toBe('ok')
  })
})
