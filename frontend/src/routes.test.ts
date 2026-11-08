import { describe, expect, it } from 'vitest'
import { checkpoint, HIGH, LOW, plannedRoute, SEVERE, tripPlan } from './test/fixtures'
import { arrival, checkpointName, explainRisk, timeCost, worstRisk } from './routes'

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

describe('worstRisk', () => {
  it('finds the worst checkpoint on the route', () => {
    const route = plannedRoute('route-1', {
      checkpoints: [
        checkpoint(0, '2026-11-09T08:00:00Z'),
        checkpoint(25, '2026-11-09T08:30:00Z', SEVERE),
        checkpoint(50, '2026-11-09T09:00:00Z', HIGH),
      ],
    })

    expect(worstRisk(route)).toEqual(SEVERE)
  })

  it('is unknown without any forecast', () => {
    const route = plannedRoute('route-1', {
      checkpoints: [checkpoint(0, '2026-11-09T08:00:00Z', null)],
    })

    expect(worstRisk(route)).toBeNull()
  })
})

describe('arrival', () => {
  it("is the last checkpoint's arrival time", () => {
    expect(arrival(plannedRoute('route-1'))).toBe('2026-11-09T10:30:00Z')
  })
})

describe('timeCost', () => {
  it('says how much longer the safer route takes', () => {
    const plan = tripPlan([
      plannedRoute('route-2', { duration_minutes: 168 }),
      plannedRoute('route-1', { duration_minutes: 150 }),
    ])

    expect(timeCost(plan)).toBe('18 min longer than Route 1, the fastest')
  })

  it('has nothing to say when the safest is also the fastest', () => {
    const plan = tripPlan([
      plannedRoute('route-1', { duration_minutes: 150 }),
      plannedRoute('route-2', { duration_minutes: 170 }),
    ])

    expect(timeCost(plan)).toBeNull()
  })
})
