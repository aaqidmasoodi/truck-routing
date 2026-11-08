import { useState } from 'react'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { TripPlan } from '../api/client'
import { formatArrival, formatDuration, formatMiles } from '../format'
import { arrival, riskyMiles, routeName } from '../routes'
import CheckpointList from './CheckpointList'
import RiskStrip from './RiskStrip'

interface RouteOptionsProps {
  plan: TripPlan
  selectedId: string
  onSelect: (routeId: string) => void
}

function RouteOptions({ plan, selectedId, onSelect }: RouteOptionsProps) {
  const [open, setOpen] = useState<string | null>(null)
  const fastest = Math.min(...plan.routes.map((route) => route.duration_minutes))

  return (
    <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {plan.routes.map((route) => {
        const selected = route.id === selectedId
        const arriving = arrival(route)
        return (
          <Card
            key={route.id}
            component="li"
            variant="outlined"
            aria-current={selected ? 'true' : undefined}
            sx={{
              bgcolor: selected ? 'm3.surfaceContainerHigh' : 'm3.surfaceContainerLowest',
              borderColor: selected ? 'primary.main' : 'm3.outlineVariant',
              borderWidth: selected ? 2 : 1,
            }}
          >
            <CardActionArea
              onClick={() => onSelect(route.id)}
              aria-label={`Show ${routeName(route)} on the map`}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                  {routeName(route)}
                </Typography>
                {route.id === plan.recommended_route_id ? (
                  <Chip size="small" label="Recommended" color="primary" />
                ) : null}
                {route.duration_minutes === fastest ? (
                  <Chip size="small" label="Fastest" color="primary" variant="outlined" />
                ) : null}
                <Typography color="text.secondary" sx={{ ml: 1 }}>
                  {formatMiles(route.distance_miles)} · {formatDuration(route.duration_minutes)}
                </Typography>
              </CardContent>
              <Stack spacing={1} sx={{ px: 2, mt: -1, pb: 1.5 }}>
                <RiskStrip checkpoints={route.checkpoints} />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    {riskyMiles(route)}
                  </Typography>
                  {arriving ? (
                    <Typography variant="body2" color="text.secondary">
                      Arrives {formatArrival(arriving, route.checkpoints[0]?.eta ?? arriving)}
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </CardActionArea>
            <Button
              size="small"
              onClick={() => setOpen(open === route.id ? null : route.id)}
              aria-expanded={open === route.id}
              sx={{ ml: 1, mb: 1 }}
            >
              {route.checkpoints.length} checkpoints
            </Button>
            <Collapse in={open === route.id} unmountOnExit>
              <CardContent sx={{ pt: 0 }}>
                <CheckpointList checkpoints={route.checkpoints} />
              </CardContent>
            </Collapse>
          </Card>
        )
      })}
    </Stack>
  )
}

export default RouteOptions
