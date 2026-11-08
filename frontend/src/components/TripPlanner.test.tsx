import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { plannedRoute, tripPlan } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import { toLocalInput } from '../tripDraft'
import TripPlanner from './TripPlanner'

const places: Record<string, object> = {
  Denv: {
    name: 'Denver',
    region: 'Colorado',
    country: 'United States',
    display_name: 'Denver, Colorado, United States',
    latitude: 39.74,
    longitude: -104.98,
  },
  Chic: {
    name: 'Chicago',
    region: 'Illinois',
    country: 'United States',
    display_name: 'Chicago, Illinois, United States',
    latitude: 41.88,
    longitude: -87.63,
  },
}

function fakeApi(planResponse: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://test')
    if (url.pathname === '/api/places/') {
      return Response.json([places[url.searchParams.get('q') ?? '']])
    }
    return planResponse()
  })
}

async function pickTrip(weight = '36000') {
  await userEvent.type(screen.getByLabelText('From'), 'Denv')
  await userEvent.click(await screen.findByText('Denver, Colorado, United States'))
  await userEvent.type(screen.getByLabelText('To'), 'Chic')
  await userEvent.click(await screen.findByText('Chicago, Illinois, United States'))
  if (weight) await userEvent.type(screen.getByLabelText('Truck weight'), weight)
}

function planCall() {
  const call = vi.mocked(fetch).mock.calls.find(([input]) => String(input) === '/api/plan/')
  return JSON.parse(String(call?.[1]?.body))
}

describe('TripPlanner', () => {
  it('needs both places and a weight before it can search', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    expect(screen.getByRole('button', { name: 'Find routes' })).toBeDisabled()
    await pickTrip('')
    expect(screen.getByRole('button', { name: 'Find routes' })).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Truck weight'), '36000')
    expect(screen.getByRole('button', { name: 'Find routes' })).toBeEnabled()
  })

  it.each(['0', '250000', 'heavy'])('rejects a weight of %s', async (weight) => {
    renderWithTheme(<TripPlanner />)

    await userEvent.type(screen.getByLabelText('Truck weight'), weight)

    expect(screen.getByText('Enter a weight up to 200,000 lb')).toBeInTheDocument()
  })

  it('plans the trip and recommends the safest route', async () => {
    fakeApi(() =>
      Response.json(
        tripPlan([plannedRoute('route-2'), plannedRoute('route-1')], {
          reason: '12 fewer miles of Severe weather',
        }),
      ),
    )
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: '10 mi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByText('2 routes found, safest first')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recommendation' })).toHaveTextContent(
      'Take Route 212 fewer miles of Severe weather.',
    )
    expect(planCall()).toMatchObject({ weight_lb: 36000, spacing_miles: 10 })
  })

  it('swaps start and destination', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Swap start and destination' }))

    expect(screen.getByLabelText('From')).toHaveValue('Chicago, Illinois, United States')
    expect(screen.getByLabelText('To')).toHaveValue('Denver, Colorado, United States')
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
    expect(planCall().origin).toEqual({ latitude: 41.88, longitude: -87.63 })
  })

  it('sends a chosen departure time', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)
    const later = new Date(Date.now() + 3 * 60 * 60 * 1000)
    later.setSeconds(0, 0)

    await pickTrip()
    fireEvent.change(screen.getByLabelText('Leave at'), {
      target: { value: toLocalInput(later) },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(planCall().departure).toBe(later.toISOString())
  })

  it('says when the departure is too far ahead', async () => {
    renderWithTheme(<TripPlanner />)

    fireEvent.change(screen.getByLabelText('Leave at'), {
      target: { value: toLocalInput(new Date(Date.now() + 72 * 60 * 60 * 1000)) },
    })

    expect(screen.getByText('Pick a time within the next 48 hours')).toBeInTheDocument()
  })

  it('will not plan a trip to the same place', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await userEvent.type(screen.getByLabelText('From'), 'Denv')
    await userEvent.click(await screen.findByText('Denver, Colorado, United States'))
    await userEvent.type(screen.getByLabelText('To'), 'Denv')
    await userEvent.click(await screen.findByText('Denver, Colorado, United States'))
    await userEvent.type(screen.getByLabelText('Truck weight'), '36000')

    expect(screen.getByText('Pick a destination different from the start')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find routes' })).toBeDisabled()
  })

  it('says what it is doing while it plans', async () => {
    let answer: (response: Response) => void = () => {}
    fakeApi(() => Response.json({}))
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://test')
      if (url.pathname === '/api/places/') {
        return Response.json([places[url.searchParams.get('q') ?? '']])
      }
      return new Promise<Response>((resolve) => {
        answer = resolve
      })
    })
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Finding routes')
    answer(Response.json(tripPlan([plannedRoute('route-1')])))
    expect(await screen.findByText('1 route found, safest first')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('plans the trip when Enter is pressed', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.type(screen.getByLabelText('Truck weight'), '{Enter}')

    expect(await screen.findByText('1 route found, safest first')).toBeInTheDocument()
  })

  it('warns when every route has No Travel weather', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')], { safe_to_travel: false })))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByText('No safe route right now')).toBeInTheDocument()
  })

  it('warns when part of the trip has no forecast', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1', { unknown_weather_miles: 40 })])))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByText(/beyond the forecast/)).toBeInTheDocument()
  })

  it("explains when there's no route", async () => {
    fakeApi(() =>
      Response.json({ detail: "There's no road route between these places." }, { status: 404 }),
    )
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There's no road route between these places.",
    )
  })
})
