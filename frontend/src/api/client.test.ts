import { describe, expect, it, vi } from 'vitest'
import { findRoutes, searchPlaces } from './client'

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

describe('findRoutes', () => {
  const denver = { latitude: 39.74, longitude: -104.98 }
  const chicago = { latitude: 41.88, longitude: -87.63 }

  it('posts the trip as JSON', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))

    await findRoutes(denver, chicago)

    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('/api/routes/')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ origin: denver, destination: chicago })
  })

  it("uses the server's message when there's no route", async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ detail: "There's no road route between these places." }, { status: 404 }),
    )

    await expect(findRoutes(denver, chicago)).rejects.toMatchObject({
      status: 404,
      message: "There's no road route between these places.",
    })
  })
})
