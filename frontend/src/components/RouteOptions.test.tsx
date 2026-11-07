import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { RouteOption } from '../api/client'
import RouteOptions from './RouteOptions'

const routes: RouteOption[] = [
  { id: 'route-1', distance_miles: 1003.2, duration_minutes: 905.5, points: [], checkpoints: [] },
  { id: 'route-2', distance_miles: 1040.7, duration_minutes: 880, points: [], checkpoints: [] },
]

describe('RouteOptions', () => {
  it('lists every route with its distance and drive time', () => {
    render(<RouteOptions routes={routes} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('1,003 mi · 15 h 6 min')).toBeInTheDocument()
    expect(within(items[1]!).getByText('1,041 mi · 14 h 40 min')).toBeInTheDocument()
  })

  it('marks the fastest route', () => {
    render(<RouteOptions routes={routes} />)

    const [first, second] = screen.getAllByRole('listitem')
    expect(within(second!).getByText('Fastest')).toBeInTheDocument()
    expect(within(first!).queryByText('Fastest')).not.toBeInTheDocument()
  })
})

describe('RouteOptions checkpoints', () => {
  const withCheckpoints: RouteOption = {
    id: 'route-1',
    distance_miles: 60,
    duration_minutes: 60,
    points: [],
    checkpoints: [
      {
        latitude: 0,
        longitude: 0,
        mile: 0,
        segment_miles: 12.5,
        eta: '2026-11-09T08:00:00Z',
        weather: null,
      },
      {
        latitude: 0,
        longitude: 0,
        mile: 25,
        segment_miles: 25,
        eta: '2026-11-09T08:25:00Z',
        weather: { wind_mph: 22, rain_in_per_hr: 0.15, snow_in_per_hr: 0 },
      },
      {
        latitude: 0,
        longitude: 0,
        mile: 60,
        segment_miles: 17.5,
        eta: '2026-11-09T09:00:00Z',
        weather: null,
      },
    ],
  }

  it('opens the checkpoint list for a route', async () => {
    render(<RouteOptions routes={[withCheckpoints]} />)

    await userEvent.click(screen.getByRole('button', { name: '3 checkpoints' }))

    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText('Checkpoint 1')).toBeInTheDocument()
    expect(screen.getByText('Destination')).toBeInTheDocument()
    expect(screen.getByText('25 mi in · 22 mph wind, 0.15 in/h rain')).toBeInTheDocument()
    expect(screen.getByText('60 mi in · No forecast')).toBeInTheDocument()
  })

  it('keeps the list closed until asked', () => {
    render(<RouteOptions routes={[withCheckpoints]} />)

    expect(screen.queryByText('Destination')).not.toBeInTheDocument()
  })
})
