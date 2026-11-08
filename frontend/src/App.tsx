import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth, type Place } from './api/client'
import PlaceSearch from './components/PlaceSearch'
import { debug } from './debug'

type ApiState = 'checking' | 'online' | 'offline'

function App() {
  const [api, setApi] = useState<ApiState>('checking')
  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)

  useEffect(() => {
    getHealth()
      .then(() => setApi('online'))
      .catch((error: unknown) => {
        debug('app', 'health check failed', error)
        setApi('offline')
      })
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ bgcolor: 'm3.surfaceContainer', color: 'm3.onSurface' }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Weather-Aware Truck Routing
          </Typography>
          <Chip
            variant="outlined"
            label={`API ${api}`}
            color={api === 'online' ? 'success' : api === 'offline' ? 'error' : 'default'}
          />
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
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
      </Container>
    </Box>
  )
}

export default App
