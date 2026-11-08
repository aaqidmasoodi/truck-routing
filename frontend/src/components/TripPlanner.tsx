import { lazy, Suspense, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { ApiError, planTrip, type Trip, type TripPlan } from '../api/client'
import { debug } from '../debug'
import { planAt } from '../timeline'
import Credits from './Credits'
import PlanningPlaceholder from './PlanningPlaceholder'
import PlanResults from './PlanResults'
import TripForm from './TripForm'

// Leaflet is the biggest dependency, so it loads in its own chunk.
const RouteMap = lazy(() => import('./RouteMap'))

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; plan: TripPlan }
  | { state: 'failed'; message: string }

/**
 * Laid out like a map app: the planner in a panel on the left and the map filling the
 * rest, or on a phone, the map pinned on top with the planner scrolling underneath.
 */
function TripPlanner() {
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' })
  const [hours, setHours] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)

  const planned = lookup.state === 'done' ? lookup.plan : null
  const plan = planned ? planAt(planned, hours) : null
  // Follow the recommendation until the driver picks a route themselves.
  const selectedId =
    plan && picked && plan.routes.some((route) => route.id === picked)
      ? picked
      : (plan?.recommended_route_id ?? '')

  const search = async (trip: Trip) => {
    setLookup({ state: 'loading' })
    try {
      const found = await planTrip(trip)
      debug('trip', found.routes.length, 'routes, recommending', found.recommended_route_id)
      setHours(0)
      setPicked(null)
      setLookup({ state: 'done', plan: found })
    } catch (error) {
      debug('trip', 'route lookup failed', error)
      const message =
        error instanceof ApiError ? error.message : "Couldn't reach the server. Try again."
      setLookup({ state: 'failed', message })
    }
  }

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Box
        component="section"
        aria-label="Trip planner"
        sx={{
          order: { xs: 2, md: 1 },
          width: { md: 440, lg: 480 },
          flexShrink: 0,
          overflowY: { md: 'auto' },
          p: { xs: 2, sm: 3 },
          bgcolor: 'm3.surfaceContainerLow',
          borderRight: { md: 1 },
          borderColor: { md: 'm3.outlineVariant' },
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom>
          Plan a trip
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Compare routes by weather risk and travel time.
        </Typography>
        <TripForm
          loading={lookup.state === 'loading'}
          onSubmit={search}
          onChange={() =>
            setLookup((current) => (current.state === 'loading' ? current : { state: 'idle' }))
          }
        />
        {lookup.state === 'loading' ? <PlanningPlaceholder /> : null}
        {lookup.state === 'failed' ? (
          <Alert severity="error" sx={{ mt: 3 }}>
            {lookup.message}
          </Alert>
        ) : null}
        {planned && plan ? (
          <PlanResults
            planned={planned}
            plan={plan}
            hours={hours}
            onHoursChange={setHours}
            selectedId={selectedId}
            onSelect={setPicked}
          />
        ) : null}
        <Credits />
      </Box>
      <Box
        component="section"
        aria-label="Map"
        sx={{
          order: { xs: 1, md: 2 },
          flex: { md: 1 },
          height: { xs: '42vh', md: 'auto' },
          // On a phone the map stays in view while the planner scrolls beneath it.
          position: { xs: 'sticky', md: 'relative' },
          top: { xs: 0 },
          zIndex: { xs: 1, md: 'auto' },
        }}
      >
        <Suspense fallback={<Skeleton variant="rectangular" sx={{ height: '100%' }} />}>
          <RouteMap routes={plan?.routes ?? []} selectedId={selectedId} onSelect={setPicked} />
        </Suspense>
      </Box>
    </Box>
  )
}

export default TripPlanner
