import { useEffect, useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import { getHealth } from './api/client'
import TripPlanner from './components/TripPlanner'
import { debug } from './debug'

type ApiState = 'checking' | 'online' | 'offline'

// Often enough to notice the backend coming back without anyone refreshing the page.
const RECHECK_MS = 30_000

const STATUS = {
  checking: { label: 'Checking the server', color: '#9e9e9e' },
  online: { label: 'Server online', color: '#2e7d32' },
  offline: { label: 'Server offline', color: '#c62828' },
} as const

/** A small traffic-light dot: green when the server answers, red when it doesn't. */
function StatusDot({ state }: { state: ApiState }) {
  const { label, color } = STATUS[state]
  return (
    <Tooltip title={label}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: color,
          boxShadow: `0 0 0 4px ${alpha(color, 0.18)}`,
          transition: 'background-color 200ms, box-shadow 200ms',
        }}
      />
    </Tooltip>
  )
}

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
        // A full-height app: the map fills the window and only the planner scrolls.
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        position="static"
        color="inherit"
        elevation={0}
        sx={{
          bgcolor: 'm3.surfaceContainer',
          color: 'm3.onSurface',
          borderBottom: 1,
          borderColor: 'm3.outlineVariant',
          zIndex: 1200,
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: 56, gap: 1.5 }}>
          <LocalShippingIcon sx={{ color: 'primary.main' }} />
          <Typography
            variant="h6"
            component="h1"
            noWrap
            sx={{ flexGrow: 1, fontSize: { xs: '1.05rem', sm: '1.2rem' }, fontWeight: 500 }}
          >
            Weather-Aware Truck Routing
          </Typography>
          <StatusDot state={api} />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <TripPlanner />
      </Box>
    </Box>
  )
}

export default App
