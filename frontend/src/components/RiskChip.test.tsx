import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../test/render'
import RiskChip from './RiskChip'

describe('RiskChip', () => {
  it('shows the level name in its colour', () => {
    renderWithTheme(<RiskChip level={{ value: 3, label: 'Severe' }} />)

    const chip = screen.getByText('Severe').closest('.MuiChip-root')
    expect(chip).toHaveStyle({ backgroundColor: '#c62828' })
  })

  it('says unknown when there is no forecast', () => {
    renderWithTheme(<RiskChip level={null} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
