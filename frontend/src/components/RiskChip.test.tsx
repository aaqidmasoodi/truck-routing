import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithTheme } from '../test/render'
import RiskChip from './RiskChip'

describe('RiskChip', () => {
  it('shows the level in plain words and its colour', () => {
    renderWithTheme(<RiskChip level={{ value: 3, label: 'Severe' }} />)

    const chip = screen.getByText('Dangerous').closest('.MuiChip-root')
    expect(chip).toHaveStyle({ backgroundColor: '#d32f2f' })
  })

  it('says when there is no forecast', () => {
    renderWithTheme(<RiskChip level={null} />)

    expect(screen.getByText('No forecast')).toBeInTheDocument()
  })
})
