import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../test/render'
import RiskChip from './RiskChip'
import { CONDITIONS } from '../conditions'

describe('RiskChip', () => {
  it('shows the level in plain words and its colour', () => {
    renderWithTheme(<RiskChip level={{ value: 3, label: 'Severe' }} />)

    const chip = screen.getByText('Dangerous').closest('.MuiChip-root')
    expect(chip).toHaveStyle({
      backgroundColor: CONDITIONS[3]!.container,
      color: CONDITIONS[3]!.onContainer,
    })
  })

  it('says when there is no forecast', () => {
    renderWithTheme(<RiskChip level={null} />)

    expect(screen.getByText('No forecast')).toBeInTheDocument()
  })
})
