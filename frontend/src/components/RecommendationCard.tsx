import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { formatArrival, formatDuration, formatMiles } from '../format'
import { arrival, routeName, timeCost, worstRisk } from '../routes'
import RiskChip from './RiskChip'

/** The answer to "which way should I go?", in a sentence or two. */
function RecommendationCard({ plan }: { plan: TripPlan }) {
  const best = plan.routes[0]
  if (!best) return null

  const safe = plan.safe_to_travel
  const arriving = arrival(best)
  const cost = timeCost(plan)
  const worst = worstRisk(best)

  return (
    <Card
      component="section"
      aria-label="Recommendation"
      elevation={0}
      sx={{
        mb: 2,
        bgcolor: safe ? 'm3.primaryContainer' : 'm3.errorContainer',
        color: safe ? 'm3.onPrimaryContainer' : 'm3.onErrorContainer',
      }}
    >
      <CardContent>
        <Typography variant="overline">
          {safe ? 'Recommended' : 'No safe route right now'}
        </Typography>
        <Typography variant="h5" component="p" sx={{ mb: 0.5 }}>
          {safe ? `Take ${routeName(best)}` : `Least risky is ${routeName(best)}`}
        </Typography>
        <Typography sx={{ mb: 1.5 }}>
          {safe
            ? `${plan.reason}.`
            : 'Every route has weather too bad to drive in. Try leaving later.'}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Typography variant="body2">
            {formatMiles(best.distance_miles)} · {formatDuration(best.duration_minutes)}
            {arriving
              ? ` · arrives ${formatArrival(arriving, best.checkpoints[0]?.eta ?? arriving)}`
              : ''}
          </Typography>
          <Typography variant="body2" sx={{ pl: 1 }}>
            Worst conditions:
          </Typography>
          <RiskChip level={worst} />
        </Stack>
        {cost ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {cost}.
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default RecommendationCard
