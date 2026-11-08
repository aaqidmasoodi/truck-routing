import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { departureClock, describeDeparture } from '../timeline'

interface DepartureSliderProps {
  /** The departure the plan was made for, as an ISO date-time. */
  departure: string
  hours: number
  maxHours: number
  /** The least risky hour to leave, offered as a shortcut. */
  safestHours: number
  onChange: (hours: number) => void
}

/** Drag to see how leaving later changes the weather on each route. */
function DepartureSlider({
  departure,
  hours,
  maxHours,
  safestHours,
  onChange,
}: DepartureSliderProps) {
  const marks = Array.from({ length: Math.floor(maxHours / 6) + 1 }, (_, i) => ({
    value: i * 6,
    label: i === 0 ? 'Now' : `+${i * 6} h`,
  }))

  return (
    <Box sx={{ px: 1, mb: 2 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, minHeight: 32 }}>
        <Typography id="departure-label" variant="subtitle2" sx={{ flexGrow: 1 }}>
          {describeDeparture(departure, hours)}
        </Typography>
        {safestHours !== hours ? (
          <Button size="small" variant="outlined" onClick={() => onChange(safestHours)}>
            {safestHours === 0 ? 'Safest: leave now' : `Safest: ${safestHours} h later`}
          </Button>
        ) : null}
      </Stack>
      <Slider
        aria-labelledby="departure-label"
        value={hours}
        min={0}
        max={maxHours}
        step={1}
        marks={marks}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => departureClock(departure, value)}
        getAriaValueText={(value) => describeDeparture(departure, value)}
        onChange={(_event, value) => onChange(value)}
      />
    </Box>
  )
}

export default DepartureSlider
