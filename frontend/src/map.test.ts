import { describe, expect, it } from 'vitest'
import { plannedRoute } from './test/fixtures'
import { boundsOf, drawOrder, lineStyle } from './map'

describe('boundsOf', () => {
  it('takes in every point of every route', () => {
    const routes = [
      plannedRoute('route-1', {
        points: [
          [53.35, -6.26],
          [53.27, -9.06],
        ],
      }),
      plannedRoute('route-2', {
        points: [
          [53.35, -6.26],
          [53.6, -7.5],
          [53.27, -9.06],
        ],
      }),
    ]

    expect(boundsOf(routes)).toEqual([
      [53.27, -9.06],
      [53.6, -6.26],
    ])
  })

  it('has nothing to show without points', () => {
    expect(boundsOf([plannedRoute('route-1', { points: [] })])).toBeNull()
  })
})

describe('lineStyle', () => {
  it('makes the selected route stand out', () => {
    const selected = lineStyle(true, 'blue', 'grey')
    const other = lineStyle(false, 'blue', 'grey')

    expect(selected.color).toBe('blue')
    expect(other.color).toBe('grey')
    expect(selected.weight).toBeGreaterThan(other.weight)
  })
})

describe('drawOrder', () => {
  it('draws the selected route last so it sits on top', () => {
    const routes = [plannedRoute('route-1'), plannedRoute('route-2'), plannedRoute('route-3')]

    expect(drawOrder(routes, 'route-1').map((route) => route.id)).toEqual([
      'route-2',
      'route-3',
      'route-1',
    ])
  })
})
