import { lazy, Suspense, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { planAt } from '../timeline'
import DepartureSlider from './DepartureSlider'
import RecommendationCard from './RecommendationCard'
import RouteOptions from './RouteOptions'

// Leaflet is the biggest dependency, so it only loads once there's something to map.
const RouteMap = lazy(() => import('./RouteMap'))

function PlanResults({ plan: planned }: { plan: TripPlan }) {
  // Both reset when a new plan comes in: back to leaving as planned, and to
  // whichever route is recommended until the driver picks one.
  const [later, setLater] = useState<{ plan: TripPlan; hours: number } | null>(null)
  const [picked, setPicked] = useState<{ plan: TripPlan; routeId: string } | null>(null)

  const hours = later?.plan === planned ? later.hours : 0
  const plan = planAt(planned, hours)
  const selectedId = picked?.plan === planned ? picked.routeId : plan.recommended_route_id
  const select = (routeId: string) => setPicked({ plan: planned, routeId })
  const departure = planned.routes[0]?.checkpoints[0]?.eta

  const count = plan.routes.length
  return (
    <Box sx={{ mt: 3 }}>
      {departure && planned.timeline.length > 1 ? (
        <DepartureSlider
          departure={departure}
          hours={hours}
          maxHours={planned.timeline.length - 1}
          onChange={(value) => setLater({ plan: planned, hours: value })}
        />
      ) : null}
      <RecommendationCard plan={plan} />
      {plan.routes.some((route) => route.unknown_weather_miles > 0) ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Part of the trip is beyond the forecast, so those miles count as Low risk.
        </Alert>
      ) : null}
      <Stack direction={{ xs: 'column', lg: 'row-reverse' }} spacing={2}>
        <Box
          sx={{
            flex: 7,
            position: { lg: 'sticky' },
            top: { lg: 16 },
            alignSelf: 'flex-start',
            width: '100%',
          }}
        >
          <Suspense
            fallback={
              <Skeleton
                variant="rounded"
                sx={{ height: { xs: 320, md: 440 }, borderRadius: '16px' }}
              />
            }
          >
            <RouteMap routes={plan.routes} selectedId={selectedId} onSelect={select} />
          </Suspense>
        </Box>
        <Box sx={{ flex: 5, minWidth: 0 }}>
          <Typography variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
            {count === 1 ? '1 route found' : `${count} routes found`}, safest first
          </Typography>
          <RouteOptions plan={plan} selectedId={selectedId} onSelect={select} />
        </Box>
      </Stack>
    </Box>
  )
}

export default PlanResults
