import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Link from '@mui/material/Link'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth } from './api/client'
import TripPlanner from './components/TripPlanner'
import { debug } from './debug'

type ApiState = 'checking' | 'online' | 'offline'

function App() {
  const [api, setApi] = useState<ApiState>('checking')

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
        <TripPlanner />
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 3 }}>
          Routes by <Link href="https://project-osrm.org">OSRM</Link>, map data ©{' '}
          <Link href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</Link>.
          Places by <Link href="https://open-meteo.com">Open-Meteo</Link>, based on{' '}
          <Link href="https://www.geonames.org">GeoNames</Link>.
        </Typography>
      </Container>
    </Box>
  )
}

export default App
