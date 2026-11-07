import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ApiError, planTrip, type Place, type Spacing, type TripPlan } from '../api/client'
import { debug } from '../debug'
import PlaceSearch from './PlaceSearch'
import { routeName } from '../routes'
import RouteOptions from './RouteOptions'
import SpacingPicker from './SpacingPicker'

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; plan: TripPlan }
  | { state: 'failed'; message: string }

const MAX_WEIGHT_LB = 200_000

function parseWeight(text: string): number | null {
  const weight = Number(text)
  return text.trim() !== '' && weight > 0 && weight <= MAX_WEIGHT_LB ? weight : null
}

function TripPlanner() {
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [spacing, setSpacing] = useState<Spacing>(25)
  const [weightText, setWeightText] = useState('')
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' })

  // Any change to the trip makes the old results stale.
  const change =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setLookup({ state: 'idle' })
    }

  const weightLb = parseWeight(weightText)
  const weightError = weightText.trim() !== '' && weightLb === null

  const search = async () => {
    if (!origin || !destination || weightLb === null) return
    setLookup({ state: 'loading' })
    try {
      const plan = await planTrip({ origin, destination, weightLb, spacingMiles: spacing })
      debug('trip', plan.routes.length, 'routes, recommending', plan.recommended_route_id)
      setLookup({ state: 'done', plan })
    } catch (error) {
      debug('trip', 'route lookup failed', error)
      const message =
        error instanceof ApiError ? error.message : "Couldn't reach the server. Try again."
      setLookup({ state: 'failed', message })
    }
  }

  return (
    <Card sx={{ p: 3, bgcolor: 'm3.surfaceContainerLow' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Plan a trip
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Compare routes by weather risk and travel time.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch label="From" value={origin} onChange={change(setOrigin)} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch label="To" value={destination} onChange={change(setDestination)} />
        </Box>
      </Stack>
      <TextField
        label="Truck weight"
        value={weightText}
        onChange={(event) => change(setWeightText)(event.target.value)}
        error={weightError}
        helperText={weightError ? 'Enter a weight up to 200,000 lb' : 'Gross weight, load included'}
        sx={{ width: { xs: '100%', sm: 260 } }}
        slotProps={{
          htmlInput: { inputMode: 'numeric' },
          input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> },
        }}
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <SpacingPicker value={spacing} onChange={change(setSpacing)} />
        <Button
          variant="contained"
          onClick={search}
          disabled={!origin || !destination || weightLb === null || lookup.state === 'loading'}
          loading={lookup.state === 'loading'}
        >
          Find routes
        </Button>
      </Stack>

      {lookup.state === 'failed' ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {lookup.message}
        </Alert>
      ) : null}
      {lookup.state === 'done' ? <PlanResults plan={lookup.plan} /> : null}
    </Card>
  )
}

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

export default TripPlanner
