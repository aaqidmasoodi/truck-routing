import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TripPlan } from '../api/client'
import { plannedRoute, tripPlan } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import { useState } from 'react'
import { planAt } from '../timeline'
import PlanResults from './PlanResults'

const score = { no_travel_miles: 0, severe_miles: 0, high_miles: 0, average_risk: 0 }
const calm = [0, 0, 0, 0, 5, 0, 0]

function stormLater(): TripPlan {
  const plan = tripPlan([plannedRoute('route-1'), plannedRoute('route-2')], {
    reason: '10 min faster',
  })
  const moment = (first: string, second: string, reason: string) => ({
    recommended_route_id: first,
    reason,
    safe_to_travel: true,
    routes: [
      { id: first, score, unknown_weather_miles: 0, conditions: [calm, calm] },
      { id: second, score, unknown_weather_miles: 0, conditions: [calm, calm] },
    ],
  })
  return {
    ...plan,
    timeline: [
      moment('route-1', 'route-2', '10 min faster'),
      moment('route-2', 'route-1', '40 fewer miles of Severe weather'),
    ],
  }
}

function Harness({ planned }: { planned: TripPlan }) {
  const [hours, setHours] = useState(0)
  const plan = planAt(planned, hours)
  return (
    <PlanResults
      planned={planned}
      plan={plan}
      hours={hours}
      onHoursChange={setHours}
      selectedId={plan.recommended_route_id}
      onSelect={() => {}}
    />
  )
}

describe('PlanResults', () => {
  it('updates the recommendation as the departure slider moves', () => {
    renderWithTheme(<Harness planned={stormLater()} />)
    const card = screen.getByRole('region', { name: 'Recommendation' })
    expect(card).toHaveTextContent('Take Route 1')

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })

    expect(card).toHaveTextContent('Take Route 2')
    expect(card).toHaveTextContent('40 fewer miles of Severe weather')
    expect(screen.getByText(/^Leave 1 h later/)).toBeInTheDocument()
  })

  it('leaves out the slider when there is no timeline', () => {
    renderWithTheme(<Harness planned={tripPlan([plannedRoute('route-1')])} />)

    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})
