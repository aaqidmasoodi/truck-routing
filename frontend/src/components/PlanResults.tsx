import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { safestHour } from '../timeline'
import DepartureSlider from './DepartureSlider'
import RecommendationCard from './RecommendationCard'
import RouteOptions from './RouteOptions'

interface PlanResultsProps {
  /** The plan as the server sent it, with its timeline. */
  planned: TripPlan
  /** The same plan for the chosen departure hour. */
  plan: TripPlan
  hours: number
  onHoursChange: (hours: number) => void
  selectedId: string
  onSelect: (routeId: string) => void
}

function PlanResults({
  planned,
  plan,
  hours,
  onHoursChange,
  selectedId,
  onSelect,
}: PlanResultsProps) {
  const departure = planned.routes[0]?.checkpoints[0]?.eta
  const count = plan.routes.length

  return (
    <Box>
      {departure && planned.timeline.length > 1 ? (
        <DepartureSlider
          departure={departure}
          hours={hours}
          maxHours={planned.timeline.length - 1}
          safestHours={safestHour(planned)}
          onChange={onHoursChange}
        />
      ) : null}
      <RecommendationCard plan={plan} />
      {plan.routes.some((route) => route.unknown_weather_miles > 0) ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Part of the trip is beyond the forecast, so those miles count as Low risk.
        </Alert>
      ) : null}
      <Typography variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
        {count === 1 ? '1 route found' : `${count} routes found`}, safest first
      </Typography>
      <RouteOptions plan={plan} selectedId={selectedId} onSelect={onSelect} />
    </Box>
  )
}

export default PlanResults
