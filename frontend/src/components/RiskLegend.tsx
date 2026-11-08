import { useState } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import ButtonBase from '@mui/material/ButtonBase'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { BANDS, CONDITIONS, type MapLayer } from '../conditions'

const TITLES: Record<MapLayer, string> = {
  overall: 'Driving conditions',
  wind: 'Wind',
  rain: 'Rain',
  snow: 'Snow',
}

interface RiskLegendProps {
  layer?: MapLayer
  bottom?: number
  /** On a phone the key starts as a small button, so it doesn't hide the route. */
  compact?: boolean
  /** Show the map's data credit here, when it's hidden from the corner of the map. */
  showCredit?: boolean
}

/** What the colours mean: advice for the overall view, real units for wind, rain, snow. */
function RiskLegend({
  layer = 'overall',
  bottom = 24,
  compact = false,
  showCredit = false,
}: RiskLegendProps) {
  // Always open on a big screen, even if the window started out phone-sized.
  const [opened, setOpen] = useState(false)
  const open = !compact || opened
  const place = {
    position: 'absolute',
    left: 12,
    bottom,
    transition: 'bottom 250ms ease',
    zIndex: 1000, // above Leaflet's panes
    bgcolor: 'm3.surfaceContainer',
    boxShadow: 2,
  } as const

  if (!open) {
    return (
      <ButtonBase
        onClick={() => setOpen(true)}
        aria-label="Show map key"
        sx={{ ...place, gap: 0.5, px: 1.25, py: 0.75, borderRadius: '16px' }}
      >
        <Stack direction="row" sx={{ gap: '2px' }}>
          {CONDITIONS.map((item) => (
            <Box
              key={item.label}
              sx={{ width: 6, height: 12, borderRadius: 1, bgcolor: item.colour }}
            />
          ))}
        </Stack>
        <Typography variant="caption" sx={{ fontWeight: 500, ml: 0.5 }}>
          Key
        </Typography>
        <InfoOutlinedIcon sx={{ fontSize: 16 }} />
      </ButtonBase>
    )
  }

  return (
    <Box sx={{ ...place, px: 1.5, py: 1, borderRadius: '12px' }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant="caption" component="p" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {TITLES[layer]}
        </Typography>
        {compact ? (
          <ButtonBase
            onClick={() => setOpen(false)}
            aria-label="Hide map key"
            sx={{ borderRadius: '50%', ml: 1 }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </ButtonBase>
        ) : null}
      </Stack>
      <Box role="list" aria-label={`${TITLES[layer]} key`}>
        {CONDITIONS.map((item, value) => (
          <Stack
            key={item.label}
            role="listitem"
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Box
              sx={{ width: 14, height: 6, borderRadius: 3, bgcolor: item.colour, flexShrink: 0 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 500, minWidth: 68 }}>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {layer === 'overall' ? item.advice : BANDS[layer][value]}
            </Typography>
          </Stack>
        ))}
      </Box>
      {layer === 'wind' ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          Heavy loads go up a level in strong wind
        </Typography>
      ) : null}
      {showCredit ? (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ mt: 0.75, fontSize: '0.65rem', maxWidth: 220 }}
        >
          Map © <Link href="https://www.esri.com">Esri</Link>, HERE, Garmin, ©{' '}
          <Link href="https://www.openstreetmap.org/copyright">OpenStreetMap</Link> contributors
        </Typography>
      ) : null}
    </Box>
  )
}

export default RiskLegend
