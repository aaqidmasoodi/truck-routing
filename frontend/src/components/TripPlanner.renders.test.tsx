import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test/render'
import TripPlanner from './TripPlanner'

// Count how often the map draws, without Leaflet. The real map is memoised the same way.
const draws = vi.hoisted(() => ({ count: 0 }))
vi.mock('./RouteMap', async () => {
  const { memo } = await import('react')
  return {
    default: memo(function CountingMap() {
      draws.count += 1
      return <div data-testid="map" />
    }),
  }
})

describe('TripPlanner redraws', () => {
  it('leaves the map alone while the form is being filled in', async () => {
    renderWithTheme(<TripPlanner />)
    await screen.findByTestId('map')
    const before = draws.count

    const weight = screen.getByLabelText('Truck weight')
    await userEvent.clear(weight)
    await userEvent.type(weight, '42000')
    const slider = screen.getByRole('slider', { name: 'Truck weight in pounds' })
    for (const value of [43000, 44000, 45000, 46000]) {
      fireEvent.change(slider, { target: { value } })
    }
    await userEvent.click(screen.getByRole('button', { name: '10 mi' }))

    expect(draws.count).toBe(before)
  })
})
