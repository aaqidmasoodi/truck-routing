import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { checkpoint, SEVERE } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import RiskStrip from './RiskStrip'
import { CONDITIONS } from '../conditions'

const checkpoints = [
  { ...checkpoint(0, '2026-11-09T08:00:00Z'), segment_miles: 5 },
  { ...checkpoint(10, '2026-11-09T08:15:00Z', SEVERE), segment_miles: 10 },
  { ...checkpoint(20, '2026-11-09T08:30:00Z', null), segment_miles: 5 },
]

describe('RiskStrip', () => {
  it('gives each stretch room for its miles and its risk colour', () => {
    renderWithTheme(<RiskStrip checkpoints={checkpoints} />)

    const stretches = screen.getAllByTestId('risk-stretch')
    expect(stretches.map((s) => getComputedStyle(s).flexGrow)).toEqual(['5', '10', '5'])
    expect(stretches[1]).toHaveStyle({ backgroundColor: CONDITIONS[3]!.colour })
  })

  it('describes the risk for screen readers', () => {
    renderWithTheme(<RiskStrip checkpoints={checkpoints} />)

    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Conditions along the route. 0 mi: Clear, 10 mi: Dangerous, 20 mi: No forecast',
    )
  })
})
