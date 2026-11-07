import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import theme from '../theme'
import RiskChip from './RiskChip'

describe('RiskChip', () => {
  it('shows the level name in its colour', () => {
    render(
      <ThemeProvider theme={theme}>
        <RiskChip level={{ value: 3, label: 'Severe' }} />
      </ThemeProvider>,
    )

    const chip = screen.getByText('Severe').closest('.MuiChip-root')
    expect(chip).toHaveStyle({ backgroundColor: '#c62828' })
  })

  it('says unknown when there is no forecast', () => {
    render(<RiskChip level={null} />)

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
