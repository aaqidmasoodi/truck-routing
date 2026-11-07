import { useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Place } from '../api/client'
import PlaceSearch from './PlaceSearch'

function TripPlanner() {
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)

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
          <PlaceSearch label="From" value={origin} onChange={setOrigin} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch label="To" value={destination} onChange={setDestination} />
        </Box>
      </Stack>
    </Card>
  )
}

export default TripPlanner
