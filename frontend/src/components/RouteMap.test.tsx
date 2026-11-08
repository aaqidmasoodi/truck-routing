import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CheckpointRisk } from '../api/client'
import { checkpoint, LOW, plannedRoute, SEVERE } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import RouteMap from './RouteMap'

const windy: CheckpointRisk = {
  level: SEVERE,
  wind: SEVERE,
  rain: LOW,
  snow: LOW,
  causes: ['wind'],
}

const routes = [
  plannedRoute('route-1', {
    points: [
      [53.35, -6.26],
      [53.3, -7.6],
      [53.27, -9.06],
    ],
    checkpoints: [
      { ...checkpoint(0, '2026-11-09T08:00:00Z'), latitude: 53.35, longitude: -6.26 },
      {
        ...checkpoint(60, '2026-11-09T09:10:00Z', SEVERE),
        latitude: 53.3,
        longitude: -7.6,
        risk: windy,
        weather: { wind_mph: 48, rain_in_per_hr: 0, snow_in_per_hr: 0 },
      },
      { ...checkpoint(130, '2026-11-09T10:30:00Z', null), latitude: 53.27, longitude: -9.06 },
    ],
  }),
  plannedRoute('route-2', {
    points: [
      [53.35, -6.26],
      [53.6, -7.5],
      [53.27, -9.06],
    ],
  }),
]

const clearRoute = plannedRoute('route-1', {
  points: routes[0]!.points,
  checkpoints: [checkpoint(0, '2026-11-09T08:00:00Z'), checkpoint(130, '2026-11-09T10:30:00Z')],
})

function strokes(container: HTMLElement, width: string) {
  return [...container.querySelectorAll('path')]
    .filter((path) => path.getAttribute('stroke-width') === width)
    .map((path) => path.getAttribute('stroke'))
}

function routeLines(container: HTMLElement) {
  return [...container.querySelectorAll('path.leaflet-interactive')]
}

function markers(container: HTMLElement) {
  return [...container.querySelectorAll('.trouble-marker')]
}

describe('RouteMap', () => {
  it('keeps every route clickable', () => {
    const onSelect = vi.fn()
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={onSelect} />,
    )

    expect(routeLines(container)).toHaveLength(2)
    fireEvent.click(routeLines(container)[0]!)
    expect(onSelect).toHaveBeenCalledWith('route-2')
  })

  it('colours the selected route like traffic, stretch by stretch', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    // Clear, then Dangerous, then no forecast: the line on top and the glow underneath.
    expect(strokes(container, '5')).toEqual(['#2e7d32', '#d32f2f', '#9e9e9e'])
    expect(strokes(container, '22')).toEqual(['#2e7d32', '#d32f2f', '#9e9e9e'])
  })

  it('puts a marker only where conditions are not clear', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    expect(markers(container)).toHaveLength(1)
    expect(container.querySelector('[title="Dangerous: strong wind"]')).not.toBeNull()
  })

  it('says what is wrong, how bad and what to do when a marker is clicked', async () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    fireEvent.click(markers(container)[0]!)

    expect(await screen.findByText('Strong wind, 48 mph. Avoid if you can.')).toBeInTheDocument()
  })

  it('sums the route up in one line', () => {
    renderWithTheme(<RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />)

    expect(screen.getByText('Dangerous: strong wind for 10 mi')).toBeInTheDocument()
  })

  it('says so when the whole route is clear', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={[clearRoute]} selectedId="route-1" onSelect={() => {}} />,
    )

    expect(screen.getByText('Clear all the way')).toBeInTheDocument()
    expect(markers(container)).toHaveLength(0)
  })
})

describe('RouteMap legend', () => {
  it('explains the colours as driving advice', () => {
    renderWithTheme(<RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />)

    const legend = screen.getByRole('list', { name: 'Driving conditions key' })
    expect(legend).toHaveTextContent('ClearNormal driving')
    expect(legend).toHaveTextContent('Do not driveWait it out')
  })

  it('switches to one condition with its real units', async () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Rain' }))

    expect(screen.getByRole('list', { name: 'Rain key' })).toHaveTextContent('Over 1 in/h')
    // The windy stretch is dry, so on the rain layer it's clear and has no marker.
    expect(strokes(container, '5')).toEqual(['#2e7d32', '#2e7d32', '#9e9e9e'])
    expect(markers(container)).toHaveLength(0)
  })
})

describe('RouteMap before a plan', () => {
  it('invites the driver to plan a trip', () => {
    renderWithTheme(<RouteMap routes={[]} selectedId="" onSelect={() => {}} />)

    expect(screen.getByText('Plan a trip to see the routes here')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Colour the route by' })).not.toBeInTheDocument()
  })
})

describe('RouteMap key on a phone', () => {
  it('starts as a small button so it does not hide the route', async () => {
    renderWithTheme(<RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} compact />)

    expect(screen.queryByRole('list', { name: 'Driving conditions key' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Show map key' }))
    expect(screen.getByRole('list', { name: 'Driving conditions key' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hide map key' }))
    expect(screen.getByRole('button', { name: 'Show map key' })).toBeInTheDocument()
  })
})
