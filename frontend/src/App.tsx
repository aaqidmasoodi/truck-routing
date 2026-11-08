import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { getHealth } from './api/client'
import TripPlanner from './components/TripPlanner'
import { debug } from './debug'

type ApiState = 'checking' | 'online' | 'offline'

// Often enough to notice the backend coming back without anyone refreshing the page.
const RECHECK_MS = 30_000

function App() {
  const [api, setApi] = useState<ApiState>('checking')

  useEffect(() => {
    const check = () =>
      getHealth()
        .then(() => setApi('online'))
        .catch((error: unknown) => {
          debug('app', 'health check failed', error)
          setApi('offline')
        })

    check()
    const timer = setInterval(check, RECHECK_MS)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', check)
    }
  }, [])

  return (
    <Box
      sx={{
        // A full-height app on bigger screens, so the map fills the window and only the
        // planner panel scrolls; on a phone the whole page scrolls as normal.
        height: { md: '100vh' },
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{ bgcolor: 'm3.surfaceContainer', color: 'm3.onSurface' }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 56 }}>
          <Typography
            variant="h6"
            component="h1"
            noWrap
            sx={{ flexGrow: 1, fontSize: { xs: '1.05rem', sm: '1.25rem' } }}
          >
            Weather-Aware Truck Routing
          </Typography>
          <Chip
            variant="outlined"
            label={`API ${api}`}
            color={api === 'online' ? 'success' : api === 'offline' ? 'error' : 'default'}
          />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <TripPlanner />
      </Box>
    </Box>
  )
}

export default App
