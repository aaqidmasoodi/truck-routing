import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Place } from '../api/client'
import PlaceSearch from './PlaceSearch'

const denver: Place = {
  name: 'Denver',
  region: 'Colorado',
  country: 'United States',
  display_name: 'Denver, Colorado, United States',
  latitude: 39.73915,
  longitude: -104.9847,
}

describe('PlaceSearch', () => {
  it('lets you pick a place from the search results', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json([denver]))
    const onChange = vi.fn()
    render(<PlaceSearch label="From" value={null} onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('From'), 'Denv')
    await userEvent.click(await screen.findByText('Denver, Colorado, United States'))

    expect(onChange).toHaveBeenCalledWith(denver)
  })

  it('searches once the user stops typing', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => Response.json([denver]))
    render(<PlaceSearch label="From" value={null} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('From'), 'Denver')
    await screen.findByText('Denver, Colorado, United States')

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('/api/places/?q=Denver', expect.anything())
  })

  it('waits for at least two letters before searching', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(<PlaceSearch label="From" value={null} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('From'), 'D')

    expect(fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Type at least 2 letters')).toBeInTheDocument()
  })

  it('says so when place search is down', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response(null, { status: 502 }),
    )
    render(<PlaceSearch label="From" value={null} onChange={() => {}} />)

    await userEvent.type(screen.getByLabelText('From'), 'Denver')

    expect(await screen.findByText('Place search is unavailable right now')).toBeInTheDocument()
  })
})
