import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth } from './api/client'
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
        <Card sx={{ p: 3, bgcolor: 'm3.surfaceContainerLow' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Plan a trip
          </Typography>
          <Typography color="text.secondary">
            Compare routes by weather risk and travel time.
          </Typography>
        </Card>
      </Container>
    </Box>
  )
}

export default App
