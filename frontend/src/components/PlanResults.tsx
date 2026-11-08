import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { routeName } from '../routes'
import RouteOptions from './RouteOptions'

function PlanResults({ plan }: { plan: TripPlan }) {
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
      <Typography variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
        {count === 1 ? '1 route found' : `${count} routes found`}, safest first
      </Typography>
      <RouteOptions plan={plan} />
    </Box>
  )
}

export default PlanResults
