import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { describeDeparture } from '../timeline'
import DepartureSlider from './DepartureSlider'

const DEPARTURE = '2026-11-09T08:00:00Z'

describe('DepartureSlider', () => {
  it('reports the hours as the driver moves it', () => {
    const onChange = vi.fn()
    render(<DepartureSlider departure={DEPARTURE} hours={0} maxHours={48} onChange={onChange} />)

    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' })

    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('marks every six hours', () => {
    render(<DepartureSlider departure={DEPARTURE} hours={0} maxHours={48} onChange={() => {}} />)

    expect(screen.getByText('Now')).toBeInTheDocument()
    expect(screen.getByText('+48 h')).toBeInTheDocument()
  })

  it('describes the departure in words', () => {
    expect(describeDeparture(DEPARTURE, 0)).toBe('Leave as planned')
    expect(describeDeparture(DEPARTURE, 5)).toMatch(/^Leave 5 h later, /)
  })
})
