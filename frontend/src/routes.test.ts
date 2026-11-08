import { describe, expect, it } from 'vitest'
import { HIGH, LOW, SEVERE } from './test/fixtures'
import { checkpointName, explainRisk } from './routes'

describe('checkpointName', () => {
  it('names the ends and numbers the rest', () => {
    expect([0, 1, 2, 3].map((index) => checkpointName(index, 4))).toEqual([
      'Start',
      'Checkpoint 1',
      'Checkpoint 2',
      'Destination',
    ])
  })
})

describe('explainRisk', () => {
  it('names the conditions behind the level', () => {
    expect(
      explainRisk({
        level: SEVERE,
        wind: SEVERE,
        rain: SEVERE,
        snow: LOW,
        causes: ['wind', 'rain'],
      }),
    ).toBe('Severe because of wind and rain')
  })

  it('just gives the level when nothing stands out', () => {
    expect(explainRisk({ level: LOW, wind: LOW, rain: LOW, snow: LOW, causes: [] })).toBe('Low')
  })

  it('says when there is no forecast', () => {
    expect(explainRisk(null)).toMatch(/no forecast/)
  })

  it('works for a single cause', () => {
    expect(explainRisk({ level: HIGH, wind: LOW, rain: HIGH, snow: LOW, causes: ['rain'] })).toBe(
      'High because of rain',
    )
  })
})
