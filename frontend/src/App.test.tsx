import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the API as online when the health check passes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByText('Weather-Aware Truck Routing')).toBeInTheDocument()
    expect(await screen.findByText('API online')).toBeInTheDocument()
  })

  it('has start and destination fields', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('shows the API as offline when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))

    render(<App />)

    expect(await screen.findByText('API offline')).toBeInTheDocument()
  })
})
