import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { ApiError, planTrip, type Trip, type TripPlan } from '../api/client'
import { debug } from '../debug'
import PlanningPlaceholder from './PlanningPlaceholder'
import PlanResults from './PlanResults'
import TripForm from './TripForm'

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; plan: TripPlan }
  | { state: 'failed'; message: string }

function TripPlanner() {
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' })

  const search = async (trip: Trip) => {
    setLookup({ state: 'loading' })
    try {
      const plan = await planTrip(trip)
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
      <TripForm
        loading={lookup.state === 'loading'}
        onSubmit={search}
        onChange={() =>
          setLookup((current) => (current.state === 'loading' ? current : { state: 'idle' }))
        }
      />
      {lookup.state === 'failed' ? (
        <Alert severity="error" sx={{ mt: 3 }}>
          {lookup.message}
        </Alert>
      ) : null}
      {lookup.state === 'loading' ? <PlanningPlaceholder /> : null}
      {lookup.state === 'done' ? <PlanResults plan={lookup.plan} /> : null}
    </Card>
  )
}

export default TripPlanner
