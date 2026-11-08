import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { plannedRoute } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import RouteMap from './RouteMap'

const routes = [
  plannedRoute('route-1', {
    points: [
      [53.35, -6.26],
      [53.3, -7.6],
      [53.27, -9.06],
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

function lines(container: HTMLElement) {
  return [...container.querySelectorAll('path.leaflet-interactive')]
}

describe('RouteMap', () => {
  it('draws every route plus start and destination markers', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    // Two route lines and two circle markers.
    expect(lines(container)).toHaveLength(4)
  })

  it('draws the selected route last, on top, and thicker', () => {
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={() => {}} />,
    )

    const [other, selected] = lines(container)
    expect(Number(selected?.getAttribute('stroke-width'))).toBeGreaterThan(
      Number(other?.getAttribute('stroke-width')),
    )
  })

  it('selects a route when its line is clicked', () => {
    const onSelect = vi.fn()
    const { container } = renderWithTheme(
      <RouteMap routes={routes} selectedId="route-1" onSelect={onSelect} />,
    )

    fireEvent.click(lines(container)[0]!)

    expect(onSelect).toHaveBeenCalledWith('route-2')
  })
})
