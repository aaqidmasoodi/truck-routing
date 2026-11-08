import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Root from './Root'

function deviceIsDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-color-scheme: dark') ? dark : false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

function background() {
  return getComputedStyle(document.body).backgroundColor
}

describe('theme switcher', () => {
  it('follows the device by default', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))
    deviceIsDark(true)
    render(<Root />)

    expect(screen.getByRole('button', { name: 'Theme: same as device' })).toBeInTheDocument()
    const dark = background()

    vi.unstubAllGlobals()
    deviceIsDark(false)
    render(<Root />)
    expect(background()).not.toBe(dark)
    vi.unstubAllGlobals()
  })

  it('goes from device to light to dark and back, and remembers the choice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'ok' }))
    deviceIsDark(false)
    const view = render(<Root />)

    await userEvent.click(screen.getByRole('button', { name: 'Theme: same as device' }))
    expect(screen.getByRole('button', { name: 'Theme: light' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Theme: light' }))
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument()
    expect(localStorage.getItem('truck-routing:theme')).toBe('dark')

    view.unmount()
    render(<Root />)
    expect(screen.getByRole('button', { name: 'Theme: dark' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Theme: dark' }))
    expect(screen.getByRole('button', { name: 'Theme: same as device' })).toBeInTheDocument()
    expect(localStorage.getItem('truck-routing:theme')).toBeNull()
    vi.unstubAllGlobals()
  })
})
