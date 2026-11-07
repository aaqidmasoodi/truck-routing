import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ApiError, findRoutes, type Place, type RouteOption } from '../api/client'
import { debug } from '../debug'
import PlaceSearch from './PlaceSearch'
import RouteOptions from './RouteOptions'

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; routes: RouteOption[] }
  | { state: 'failed'; message: string }

function TripPlanner() {
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' })

  const choose = (setPlace: (place: Place | null) => void) => (place: Place | null) => {
    setPlace(place)
    setLookup({ state: 'idle' })
  }

  const search = async () => {
    if (!origin || !destination) return
    setLookup({ state: 'loading' })
    try {
      const routes = await findRoutes(origin, destination)
      debug('trip', `${routes.length} routes`, origin.display_name, '->', destination.display_name)
      setLookup({ state: 'done', routes })
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
          <PlaceSearch label="From" value={origin} onChange={choose(setOrigin)} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch label="To" value={destination} onChange={choose(setDestination)} />
        </Box>
      </Stack>
      <Button
        variant="contained"
        onClick={search}
        disabled={!origin || !destination || lookup.state === 'loading'}
        loading={lookup.state === 'loading'}
        sx={{ mt: 1 }}
      >
        Find routes
      </Button>

      {lookup.state === 'failed' ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {lookup.message}
        </Alert>
      ) : null}
      {lookup.state === 'done' ? (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" component="h3" sx={{ mb: 1.5 }}>
            {lookup.routes.length === 1 ? '1 route found' : `${lookup.routes.length} routes found`}
          </Typography>
          <RouteOptions routes={lookup.routes} />
        </Box>
      ) : null}
    </Card>
  )
}

export default TripPlanner
