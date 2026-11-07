import { afterEach, describe, expect, it, vi } from 'vitest'
import { debug } from './debug'

describe('debug', () => {
  afterEach(() => vi.restoreAllMocks())

  it('prefixes messages with their scope', () => {
    const log = vi.spyOn(console, 'debug').mockImplementation(() => {})

    debug('api', 'GET /api/health/', 200)

    expect(log).toHaveBeenCalledWith('[api]', 'GET /api/health/', 200)
  })
})
