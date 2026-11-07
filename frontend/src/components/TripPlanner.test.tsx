import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TripPlanner from './TripPlanner'

const places: Record<string, object> = {
  Denv: {
    name: 'Denver',
    region: 'Colorado',
    country: 'United States',
    display_name: 'Denver, Colorado, United States',
    latitude: 39.74,
    longitude: -104.98,
  },
  Chic: {
    name: 'Chicago',
    region: 'Illinois',
    country: 'United States',
    display_name: 'Chicago, Illinois, United States',
    latitude: 41.88,
    longitude: -87.63,
  },
}

function fakeApi(routesResponse: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://test')
    if (url.pathname === '/api/places/') {
      return Response.json([places[url.searchParams.get('q') ?? '']])
    }
    return routesResponse()
  })
}

async function pickTrip() {
  await userEvent.type(screen.getByLabelText('From'), 'Denv')
  await userEvent.click(await screen.findByText('Denver, Colorado, United States'))
  await userEvent.type(screen.getByLabelText('To'), 'Chic')
  await userEvent.click(await screen.findByText('Chicago, Illinois, United States'))
}

describe('TripPlanner', () => {
  it('needs both places before it can search', () => {
    render(<TripPlanner />)

    expect(screen.getByRole('button', { name: 'Find routes' })).toBeDisabled()
  })

  it('shows the routes it finds', async () => {
    fakeApi(() =>
      Response.json([
        { id: 'route-1', distance_miles: 1003, duration_minutes: 905, points: [] },
        { id: 'route-2', distance_miles: 1040, duration_minutes: 930, points: [] },
      ]),
    )
    render(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByText('2 routes found')).toBeInTheDocument()
    expect(screen.getByText('1,003 mi · 15 h 5 min')).toBeInTheDocument()
  })

  it("explains when there's no route", async () => {
    fakeApi(() =>
      Response.json({ detail: "There's no road route between these places." }, { status: 404 }),
    )
    render(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There's no road route between these places.",
    )
  })
})
