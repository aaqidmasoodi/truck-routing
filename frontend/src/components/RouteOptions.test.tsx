import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test/render'
import { checkpoint, plannedRoute, SEVERE, tripPlan } from '../test/fixtures'
import { riskyMiles } from '../routes'
import RouteOptions from './RouteOptions'

const safe = plannedRoute('route-2', { duration_minutes: 160 })
const stormy = plannedRoute('route-1', {
  duration_minutes: 150,
  score: { no_travel_miles: 0, severe_miles: 12.4, high_miles: 30, average_risk: 1.1 },
  checkpoints: [
    checkpoint(0, '2026-11-09T08:00:00Z'),
    checkpoint(25, '2026-11-09T08:30:00Z', SEVERE),
    checkpoint(60, '2026-11-09T09:10:00Z', null),
  ],
})

describe('RouteOptions', () => {
  it('lists routes safest first and marks the recommendation', () => {
    renderWithTheme(
      <RouteOptions plan={tripPlan([safe, stormy])} selectedId="route-2" onSelect={() => {}} />,
    )

    const [first, second] = screen.getAllByRole('listitem')
    expect(within(first!).getByText('Route 2')).toBeInTheDocument()
    expect(within(first!).getByText('Recommended')).toBeInTheDocument()
    expect(within(second!).queryByText('Recommended')).not.toBeInTheDocument()
  })

  it('marks the fastest route, which may not be the safest', () => {
    renderWithTheme(
      <RouteOptions plan={tripPlan([safe, stormy])} selectedId="route-2" onSelect={() => {}} />,
    )

    const [first, second] = screen.getAllByRole('listitem')
    expect(within(second!).getByText('Fastest')).toBeInTheDocument()
    expect(within(first!).queryByText('Fastest')).not.toBeInTheDocument()
  })

  it('summarises the risky miles on each route', () => {
    renderWithTheme(
      <RouteOptions plan={tripPlan([safe, stormy])} selectedId="route-2" onSelect={() => {}} />,
    )

    expect(screen.getByText('No High or Severe weather')).toBeInTheDocument()
    expect(screen.getByText('12 mi Severe · 30 mi High')).toBeInTheDocument()
  })

  it('shows each checkpoint with its risk', async () => {
    renderWithTheme(
      <RouteOptions plan={tripPlan([stormy])} selectedId="route-2" onSelect={() => {}} />,
    )

    await userEvent.click(screen.getByRole('button', { name: '3 checkpoints' }))

    expect(screen.getByText('Checkpoint 1')).toBeInTheDocument()
    expect(screen.getByText('Severe')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('60 mi in · No forecast')).toBeInTheDocument()
  })
})

describe('RouteOptions selection', () => {
  it('marks the selected route and reports clicks', async () => {
    const onSelect = vi.fn()
    renderWithTheme(
      <RouteOptions plan={tripPlan([safe, stormy])} selectedId="route-2" onSelect={onSelect} />,
    )

    const [first] = screen.getAllByRole('listitem')
    expect(first).toHaveAttribute('aria-current', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Show Route 1 on the map' }))
    expect(onSelect).toHaveBeenCalledWith('route-1')
  })
})

describe('riskyMiles', () => {
  it('leads with No Travel when there is any', () => {
    const route = plannedRoute('route-1', {
      score: { no_travel_miles: 4, severe_miles: 0, high_miles: 0.2, average_risk: 1 },
    })

    expect(riskyMiles(route)).toBe('4 mi No Travel')
  })
})
