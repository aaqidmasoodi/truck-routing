import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { RouteOption } from '../api/client'
import { formatDuration, formatMiles } from '../format'

interface RouteOptionsProps {
  routes: RouteOption[]
}

function RouteOptions({ routes }: RouteOptionsProps) {
  const fastest = Math.min(...routes.map((route) => route.duration_minutes))

  return (
    <Stack spacing={1.5} component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {routes.map((route, index) => (
        <Card
          key={route.id}
          component="li"
          variant="outlined"
          sx={{ bgcolor: 'm3.surfaceContainerLowest', borderColor: 'm3.outlineVariant' }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
              Route {index + 1}
            </Typography>
            {route.duration_minutes === fastest ? (
              <Chip size="small" label="Fastest" color="primary" variant="outlined" />
            ) : null}
            <Typography color="text.secondary">
              {formatMiles(route.distance_miles)} · {formatDuration(route.duration_minutes)}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

export default RouteOptions
