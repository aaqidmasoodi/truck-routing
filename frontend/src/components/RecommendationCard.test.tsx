import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { checkpoint, plannedRoute, SEVERE, tripPlan } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import RecommendationCard from './RecommendationCard'

const safer = plannedRoute('route-2', { duration_minutes: 168, distance_miles: 134 })
const faster = plannedRoute('route-1', { duration_minutes: 150 })

describe('RecommendationCard', () => {
  it('names the route, the reason and the time it costs', () => {
    renderWithTheme(
      <RecommendationCard
        plan={tripPlan([safer, faster], { reason: '30 fewer miles of High risk weather' })}
      />,
    )

    const card = screen.getByRole('region', { name: 'Recommendation' })
    expect(card).toHaveTextContent('Take Route 2')
    expect(card).toHaveTextContent('30 fewer miles of High risk weather.')
    expect(card).toHaveTextContent('134 mi · 2 h 48 min · arrives')
    expect(card).toHaveTextContent('18 min longer than Route 1, the fastest.')
  })

  it('leaves out the time cost when the safest route is also the fastest', () => {
    renderWithTheme(<RecommendationCard plan={tripPlan([faster, safer])} />)

    expect(screen.queryByText(/longer than/)).not.toBeInTheDocument()
  })

  it('shows the worst risk on the way', () => {
    const route = plannedRoute('route-1', {
      checkpoints: [
        checkpoint(0, '2026-11-09T08:00:00Z'),
        checkpoint(30, '2026-11-09T08:40:00Z', SEVERE),
      ],
    })

    renderWithTheme(<RecommendationCard plan={tripPlan([route])} />)

    expect(screen.getByText('Severe')).toBeInTheDocument()
  })

  it('says plainly when no route is safe', () => {
    renderWithTheme(<RecommendationCard plan={tripPlan([faster], { safe_to_travel: false })} />)

    const card = screen.getByRole('region', { name: 'Recommendation' })
    expect(card).toHaveTextContent('No safe route right now')
    expect(card).toHaveTextContent('Least risky is Route 1')
  })
})
