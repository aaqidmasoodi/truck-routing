import Alert from '@mui/material/Alert'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { routeName } from '../routes'
import RouteMap from './RouteMap'
import RouteOptions from './RouteOptions'

function PlanResults({ plan }: { plan: TripPlan }) {
  // A new plan starts on its recommended route; a click picks another.
  const [picked, setPicked] = useState<{ plan: TripPlan; routeId: string } | null>(null)
  const selectedId = picked?.plan === plan ? picked.routeId : plan.recommended_route_id
  const select = (routeId: string) => setPicked({ plan, routeId })

  const best = plan.routes[0]
  const count = plan.routes.length
  return (
    <Box sx={{ mt: 3 }}>
      {best && plan.safe_to_travel ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Take {routeName(best)}. {plan.reason}.
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 2 }}>
          Every route runs into No Travel weather. Consider leaving later.
        </Alert>
      )}
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
          <RouteMap routes={plan.routes} selectedId={selectedId} onSelect={select} />
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
