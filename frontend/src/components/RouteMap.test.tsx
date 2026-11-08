import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { checkpoint, plannedRoute, SEVERE } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import RouteMap from './RouteMap'

const routes = [
  plannedRoute('route-1', {
    points: [
      [53.35, -6.26],
      [53.3, -7.6],
      [53.27, -9.06],
    ],
    checkpoints: [
      { ...checkpoint(0, '2026-11-09T08:00:00Z'), latitude: 53.35, longitude: -6.26 },
      { ...checkpoint(60, '2026-11-09T09:10:00Z', SEVERE), latitude: 53.3, longitude: -7.6 },
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

function shapes(container: HTMLElement) {
  return [...container.querySelectorAll('path.leaflet-interactive')]
}

function bands(container: HTMLElement) {
  return [...container.querySelectorAll('path:not(.leaflet-interactive)')].filter(
    (path) => path.getAttribute('stroke-width') === '18',
  )
}

function routeLines(container: HTMLElement) {
  return shapes(container).filter((path) => path.getAttribute('fill') === 'none')
}

describe('RouteMap', () => {
  it('draws every route and the checkpoints of the selected one', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    expect(routeLines(container)).toHaveLength(2)
    // Three checkpoint dots; the start and end rings are not clickable.
    expect(shapes(container)).toHaveLength(5)
  })

  it('draws the selected route last, on top, and thicker', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    const [other, selected] = routeLines(container)
    expect(Number(selected?.getAttribute('stroke-width'))).toBeGreaterThan(
      Number(other?.getAttribute('stroke-width')),
    )
  })

  it('selects a route when its line is clicked', () => {
    const onSelect = vi.fn()
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={onSelect} />,
    )

    fireEvent.click(routeLines(container)[0]!)

    expect(onSelect).toHaveBeenCalledWith('route-2')
  })

  it('colours checkpoints by risk', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    const fills = shapes(container)
      .filter((path) => path.getAttribute('fill') !== 'none')
      .map((path) => path.getAttribute('fill'))
    expect(fills).toEqual(['#2e7d32', '#c62828', '#9e9e9e'])
  })

  it('shows the weather and risk when a checkpoint is clicked', async () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )
    const severe = shapes(container).find((path) => path.getAttribute('fill') === '#c62828')

    fireEvent.click(severe!)

    expect(await screen.findByText('Checkpoint 1')).toBeInTheDocument()
    expect(screen.getByText('Severe because of wind')).toBeInTheDocument()
  })
})

describe('RouteMap legend', () => {
  it('explains the checkpoint colours', () => {
    renderWithTheme(<RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />)

    const legend = screen.getByRole('list', { name: 'Risk levels' })
    expect(legend).toHaveTextContent('LowModerateHighSevereNo Travel')
  })
})

describe('RouteMap heatmap', () => {
  it('lays a band along the selected route, one stretch per checkpoint', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    expect(bands(container).map((band) => band.getAttribute('stroke'))).toEqual([
      '#2e7d32',
      '#c62828',
      '#bdbdbd',
    ])
  })

  it('switches the band to a weather layer', async () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Wind' }))

    expect(bands(container)[0]?.getAttribute('stroke')).not.toBe('#2e7d32')
    expect(screen.getByRole('img', { name: 'wind scale' })).toHaveTextContent('55+ mph')
  })
})
