import { describe, expect, it, vi } from 'vitest'
import { searchPlaces } from './client'

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
