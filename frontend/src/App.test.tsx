import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the API as online when the health check passes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByText('Weather-Aware Truck Routing')).toBeInTheDocument()
    expect(await screen.findByText('API online')).toBeInTheDocument()
  })

  it('checks again when the window regains focus', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)
    expect(await screen.findByText('API offline')).toBeInTheDocument()

    act(() => {
      fireEvent.focus(window)
    })

    expect(await screen.findByText('API online')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('has start and destination fields', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })

  it('credits the map and place data', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByRole('link', { name: 'OpenStreetMap contributors' })).toBeInTheDocument()
  })

  it('links to the API docs', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))

    render(<App />)

    expect(screen.getByRole('link', { name: 'API docs' })).toHaveAttribute('href', '/api/docs/')
  })

  it('shows the API as offline when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))

    render(<App />)

    expect(await screen.findByText('API offline')).toBeInTheDocument()
  })
})
