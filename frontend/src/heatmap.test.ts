import { describe, expect, it } from 'vitest'
import { checkpoint } from './test/fixtures'
import { midpointAlong, milesBetween, stretches } from './heatmap'
import type { LatLng } from './map'

// Due north along the meridian, about 69.1 miles per degree.
const NORTH: LatLng[] = [
  [0, 0],
  [0.25, 0],
  [0.5, 0],
  [0.75, 0],
  [1, 0],
]

describe('milesBetween', () => {
  it('measures a degree of latitude as about 69 miles', () => {
    expect(milesBetween([0, 0], [1, 0])).toBeCloseTo(69.1, 1)
  })
})

describe('stretches', () => {
  const checkpoints = [
    checkpoint(0, '2026-11-09T08:00:00Z'),
    checkpoint(50, '2026-11-09T09:00:00Z'),
    checkpoint(100, '2026-11-09T10:00:00Z'),
  ]

  it('gives every checkpoint its own stretch of road', () => {
    const result = stretches(NORTH, checkpoints, 100)

    expect(result.map((stretch) => stretch.checkpoint)).toEqual([0, 1, 2])
  })

  it('cuts halfway between checkpoints, scaled to the road distance', () => {
    const [first, second, third] = stretches(NORTH, checkpoints, 100)

    // Cuts at road miles 25 and 75 of 100, so a quarter and three quarters up.
    expect(first!.positions.at(-1)![0]).toBeCloseTo(0.25)
    expect(second!.positions[0]![0]).toBeCloseTo(0.25)
    expect(second!.positions.at(-1)![0]).toBeCloseTo(0.75)
    expect(third!.positions.at(-1)).toEqual([1, 0])
  })

  it('splits inside a long straight with no points in between', () => {
    const result = stretches(
      [
        [0, 0],
        [1, 0],
      ],
      checkpoints,
      100,
    )

    expect(result).toHaveLength(3)
    expect(result[1]!.positions).toHaveLength(2)
  })

  it('has nothing to draw without a shape', () => {
    expect(stretches([[0, 0]], checkpoints, 100)).toEqual([])
  })
})

describe('midpointAlong', () => {
  it('finds the halfway point along a straight path', () => {
    const [lat, lon] = midpointAlong([
      [0, 0],
      [0, 10],
    ])!

    expect(lat).toBeCloseTo(0)
    expect(lon).toBeCloseTo(5)
  })

  it('measures along the path, not between its ends', () => {
    // Up 10 degrees, then across 2: halfway is still on the long first leg.
    const [lat, lon] = midpointAlong([
      [0, 0],
      [10, 0],
      [10, 2],
    ])!

    expect(lon).toBeCloseTo(0)
    expect(lat).toBeGreaterThan(5)
    expect(lat).toBeLessThan(7)
  })

  it('copes with a single point or none', () => {
    expect(midpointAlong([[1, 2]])).toEqual([1, 2])
    expect(midpointAlong([])).toBeNull()
  })
})
