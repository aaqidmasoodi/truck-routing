import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RouteOption } from '../api/client'
import RouteOptions from './RouteOptions'

const routes: RouteOption[] = [
  { id: 'route-1', distance_miles: 1003.2, duration_minutes: 905.5, points: [] },
  { id: 'route-2', distance_miles: 1040.7, duration_minutes: 880, points: [] },
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
