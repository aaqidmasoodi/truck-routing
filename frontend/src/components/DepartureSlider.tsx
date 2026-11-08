import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import { departureClock, describeDeparture } from '../timeline'

interface DepartureSliderProps {
  /** The departure the plan was made for, as an ISO date-time. */
  departure: string
  hours: number
  maxHours: number
  onChange: (hours: number) => void
}

/** Drag to see how leaving later changes the weather on each route. */
function DepartureSlider({ departure, hours, maxHours, onChange }: DepartureSliderProps) {
  const marks = Array.from({ length: Math.floor(maxHours / 6) + 1 }, (_, i) => ({
    value: i * 6,
    label: i === 0 ? 'Now' : `+${i * 6} h`,
  }))

  return (
    <Box sx={{ px: 1, mb: 2 }}>
      <Typography id="departure-label" variant="subtitle2" gutterBottom>
        {describeDeparture(departure, hours)}
      </Typography>
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
