import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SpacingPicker from './SpacingPicker'

describe('SpacingPicker', () => {
  it('shows the current spacing as selected', () => {
    render(<SpacingPicker value={25} onChange={() => {}} />)

    expect(screen.getByRole('button', { name: '25 mi' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '10 mi' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports a new choice', async () => {
    const onChange = vi.fn()
    render(<SpacingPicker value={25} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: '50 mi' }))

    expect(onChange).toHaveBeenCalledWith(50)
  })

  it('keeps a choice when the selected one is clicked again', async () => {
    const onChange = vi.fn()
    render(<SpacingPicker value={25} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: '25 mi' }))

    expect(onChange).not.toHaveBeenCalled()
  })
})
