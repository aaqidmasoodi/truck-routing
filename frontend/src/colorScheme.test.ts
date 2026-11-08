import { describe, expect, it } from 'vitest'
import { buildColorScheme } from './colorScheme'

const hex = /^#[0-9a-f]{6}$/

describe('buildColorScheme', () => {
  it('returns a hex value for every role', () => {
    const scheme = buildColorScheme('#0b57d0')
    for (const value of Object.values(scheme)) {
      expect(value).toMatch(hex)
    }
  })

  it('gives light and dark schemes different surfaces', () => {
    expect(buildColorScheme('#0b57d0').surface).not.toBe(buildColorScheme('#0b57d0', true).surface)
  })

  it('keeps text readable on primary', () => {
    const { primary, onPrimary } = buildColorScheme('#0b57d0')
    expect(primary).not.toBe(onPrimary)
  })
})
