import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { plannedRoute, tripPlan } from '../test/fixtures'
import { renderWithTheme } from '../test/render'
import { toLocalInput } from '../tripDraft'
import TripPlanner from './TripPlanner'

/** Pretend the screen is a desktop (wide) or a phone, for the layout's media query. */
function setScreen(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

beforeEach(() => setScreen(true))
afterEach(() => vi.unstubAllGlobals())

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
  const field = screen.getByLabelText('Truck weight')
  await userEvent.clear(field)
  if (weight) await userEvent.type(field, weight)
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
    await userEvent.clear(screen.getByLabelText('Truck weight'))
    await userEvent.type(screen.getByLabelText('Truck weight'), '36000')
    expect(screen.getByRole('button', { name: 'Find routes' })).toBeEnabled()
  })

  it.each(['0', '250000', 'heavy'])('rejects a weight of %s', async (weight) => {
    renderWithTheme(<TripPlanner />)

    await userEvent.clear(screen.getByLabelText('Truck weight'))
    await userEvent.type(screen.getByLabelText('Truck weight'), weight)

    expect(screen.getByText('Enter a weight up to 200,000 lb')).toBeInTheDocument()
  })

  it('plans the trip and recommends the safest route', async () => {
    fakeApi(() =>
      Response.json(
        tripPlan([plannedRoute('route-2'), plannedRoute('route-1')], {
          reason: '12 fewer miles of dangerous weather',
        }),
      ),
    )
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: '10 mi' }))
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByText('2 routes found, safest first')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recommendation' })).toHaveTextContent(
      'Take Route 212 fewer miles of dangerous weather.',
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
    await userEvent.clear(screen.getByLabelText('Truck weight'))
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
  it('goes to a results page and back, keeping the trip', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    expect(await screen.findByRole('heading', { name: 'Denver → Chicago' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Find routes' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to trip' }))

    expect(screen.getByRole('button', { name: 'Find routes' })).toBeEnabled()
    expect(screen.getByLabelText('From')).toHaveValue('Denver, Colorado, United States')
  })

  describe('on a phone', () => {
    beforeEach(() => setScreen(false))

    it('shows short results in the sheet', async () => {
      fakeApi(() =>
        Response.json(
          tripPlan([plannedRoute('route-2'), plannedRoute('route-1')], {
            reason: '12 fewer miles of dangerous weather',
          }),
        ),
      )
      renderWithTheme(<TripPlanner />)

      await pickTrip()
      await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

      expect(await screen.findByText('2 routes found, safest first')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Recommendation' })).toHaveTextContent(
        'Take Route 2 12 fewer miles of dangerous weather.',
      )
      await userEvent.click(screen.getByRole('button', { name: 'Show Route 1 on the map' }))
      expect(screen.getByRole('button', { name: 'Show Route 1 on the map' })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })

    it('opens all the way for every detail, checkpoints included', async () => {
      fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
      renderWithTheme(<TripPlanner />)

      await pickTrip()
      await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
      await userEvent.click(await screen.findByRole('button', { name: 'Details & checkpoints' }))

      expect(screen.getByRole('button', { name: /checkpoints$/ })).toBeInTheDocument()
      expect(screen.getByText('1 route found, safest first')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Show less' }))
      expect(screen.getByRole('button', { name: 'Details & checkpoints' })).toBeInTheDocument()
    })

    it('slides the sheet down out of the way and back up', async () => {
      renderWithTheme(<TripPlanner />)

      await userEvent.click(screen.getByRole('button', { name: 'Hide planner' }))
      expect(screen.getByRole('button', { name: 'Show planner' })).toHaveAttribute(
        'aria-expanded',
        'false',
      )

      await userEvent.click(screen.getByRole('button', { name: 'Show planner' }))
      expect(screen.getByRole('button', { name: 'Hide planner' })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })
  })
})

describe('recent searches', () => {
  async function planOnce() {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    const first = renderWithTheme(<TripPlanner />)
    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
    await screen.findByText('1 route found, safest first')
    first.unmount()
    // Come back to the plain page, not the trip's own link.
    window.history.replaceState(null, '', '/')
  }

  it('offers a recent trip that fills in both ends', async () => {
    await planOnce()
    renderWithTheme(<TripPlanner />)

    await userEvent.click(screen.getByRole('button', { name: 'Denver → Chicago' }))

    expect(screen.getByLabelText('From')).toHaveValue('Denver, Colorado, United States')
    expect(screen.getByLabelText('To')).toHaveValue('Chicago, Illinois, United States')
  })

  it('lists recent places before anything is typed', async () => {
    await planOnce()
    renderWithTheme(<TripPlanner />)

    await userEvent.click(screen.getByLabelText('To'))

    expect(screen.getByText('Recent')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: 'Chicago, Illinois, United States' }))
    expect(screen.getByLabelText('To')).toHaveValue('Chicago, Illinois, United States')
  })

  it('shows nothing extra the first time', () => {
    renderWithTheme(<TripPlanner />)

    expect(screen.queryByLabelText('Last trip')).not.toBeInTheDocument()
  })
})

describe('last trip', () => {
  it('shows only the most recent trip below the fields', () => {
    const place = (name: string, latitude: number) => ({
      name,
      region: '',
      country: '',
      display_name: name,
      latitude,
      longitude: 0,
    })
    localStorage.setItem(
      'truck-routing:recent-trips',
      JSON.stringify([
        { origin: place('Austin', 1), destination: place('Dallas', 2) },
        { origin: place('Denver', 3), destination: place('Chicago', 4) },
      ]),
    )

    renderWithTheme(<TripPlanner />)

    expect(screen.getByRole('button', { name: 'Austin → Dallas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Denver → Chicago' })).not.toBeInTheDocument()
  })
})

describe('truck weight', () => {
  it('starts at a typical loaded truck, so only the places are needed', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    expect(screen.getByLabelText('Truck weight')).toHaveValue('65000')
    await userEvent.type(screen.getByLabelText('From'), 'Denv')
    await userEvent.click(await screen.findByText('Denver, Colorado, United States'))
    await userEvent.type(screen.getByLabelText('To'), 'Chic')
    await userEvent.click(await screen.findByText('Chicago, Illinois, United States'))
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))

    await screen.findByText('1 route found, safest first')
    expect(planCall().weight_lb).toBe(65000)
  })

  it('shows the slider only while the weight is being set', async () => {
    renderWithTheme(<TripPlanner />)
    const slider = () => screen.queryByRole('slider', { name: 'Truck weight in pounds' })

    expect(slider()).toBeNull()
    await userEvent.click(screen.getByLabelText('Truck weight'))
    expect(slider()).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Leave at'))
    await vi.waitFor(() => expect(slider()).toBeNull())
  })

  it('moves with the slider, and the slider follows what is typed', async () => {
    renderWithTheme(<TripPlanner />)
    await userEvent.click(screen.getByLabelText('Truck weight'))
    const slider = screen.getByRole('slider', { name: 'Truck weight in pounds' })

    fireEvent.change(slider, { target: { value: 42000 } })
    expect(screen.getByLabelText('Truck weight')).toHaveValue('42000')

    await userEvent.clear(screen.getByLabelText('Truck weight'))
    await userEvent.type(screen.getByLabelText('Truck weight'), '30000')
    expect(slider).toHaveValue('30000')
  })

  it('keeps the slider at its end for heavier trucks that are typed in', async () => {
    renderWithTheme(<TripPlanner />)
    await userEvent.click(screen.getByLabelText('Truck weight'))

    await userEvent.clear(screen.getByLabelText('Truck weight'))
    await userEvent.type(screen.getByLabelText('Truck weight'), '120000')

    expect(screen.getByRole('slider', { name: 'Truck weight in pounds' })).toHaveValue('80000')
  })
})

describe('shareable links', () => {
  it('puts the planned trip in the page address', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await pickTrip('42000')
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
    await screen.findByText('1 route found, safest first')

    const params = new URLSearchParams(window.location.search)
    expect(params.get('fromName')).toBe('Denver, Colorado, United States')
    expect(params.get('to')).toBe('41.88000,-87.63000')
    expect(params.get('w')).toBe('42000')
    expect(params.get('every')).toBe('25')
  })

  it('opens a link straight onto the planned trip', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    window.history.replaceState(
      null,
      '',
      '/?from=39.74,-104.98&fromName=Denver%2C+Colorado&to=41.88,-87.63&toName=Chicago%2C+Illinois&w=30000&every=10',
    )

    renderWithTheme(<TripPlanner />)

    expect(await screen.findByText('1 route found, safest first')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Denver → Chicago' })).toBeInTheDocument()
    expect(planCall()).toMatchObject({
      origin: { latitude: 39.74, longitude: -104.98 },
      weight_lb: 30000,
      spacing_miles: 10,
    })
  })

  it('copies the link', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
    await screen.findByText('1 route found, safest first')
    await userEvent.click(screen.getByRole('button', { name: 'Copy link to this trip' }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(await screen.findByText('Link copied')).toBeInTheDocument()
  })
})

describe('page address after going back', () => {
  it('starts afresh when going back to edit the trip, keeping what was typed', async () => {
    fakeApi(() => Response.json(tripPlan([plannedRoute('route-1')])))
    renderWithTheme(<TripPlanner />)

    await pickTrip()
    await userEvent.click(screen.getByRole('button', { name: 'Find routes' }))
    await screen.findByText('1 route found, safest first')
    expect(window.location.search).toContain('from=')

    await userEvent.click(screen.getByRole('button', { name: 'Back to trip' }))

    expect(window.location.search).toBe('')
    expect(screen.getByLabelText('From')).toHaveValue('Denver, Colorado, United States')
    // The routes have left the map too.
    expect(await screen.findByText('Plan a trip to see the routes here')).toBeInTheDocument()
  })
})
