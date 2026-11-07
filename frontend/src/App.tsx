import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth } from './api/client'

type ApiState = 'checking' | 'online' | 'offline'

function App() {
  const [api, setApi] = useState<ApiState>('checking')

  useEffect(() => {
    getHealth()
      .then(() => setApi('online'))
      .catch(() => setApi('offline'))
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Weather-Aware Truck Routing
          </Typography>
          <Chip
            size="small"
            label={`API ${api}`}
            color={api === 'online' ? 'success' : api === 'offline' ? 'error' : 'default'}
          />
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">
          Plan a trip to compare routes by weather risk and travel time.
        </Typography>
      </Container>
    </Box>
  )
}

export default App
