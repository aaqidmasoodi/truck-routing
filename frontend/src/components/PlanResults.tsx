import Alert from '@mui/material/Alert'
import { lazy, Suspense, useState } from 'react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import RecommendationCard from './RecommendationCard'
import RouteOptions from './RouteOptions'

// Leaflet is the biggest dependency, so it only loads once there's something to map.
const RouteMap = lazy(() => import('./RouteMap'))

function PlanResults({ plan }: { plan: TripPlan }) {
  // A new plan starts on its recommended route; a click picks another.
  const [picked, setPicked] = useState<{ plan: TripPlan; routeId: string } | null>(null)
  const selectedId = picked?.plan === plan ? picked.routeId : plan.recommended_route_id
  const select = (routeId: string) => setPicked({ plan, routeId })

  const count = plan.routes.length
  return (
    <Box sx={{ mt: 3 }}>
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
