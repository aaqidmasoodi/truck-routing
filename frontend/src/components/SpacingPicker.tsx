import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import type { Spacing } from '../api/client'

const SPACINGS: Spacing[] = [10, 25, 50]

interface SpacingPickerProps {
  value: Spacing
  onChange: (spacing: Spacing) => void
}

function SpacingPicker({ value, onChange }: SpacingPickerProps) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
      <Typography id="spacing-label" variant="body2" color="text.secondary">
        Check weather every
      </Typography>
      <ToggleButtonGroup
        aria-labelledby="spacing-label"
        size="small"
        exclusive
        value={value}
        onChange={(_event, spacing: Spacing | null) => {
          // Clicking the selected option again would clear it, so ignore that.
          if (spacing !== null) onChange(spacing)
        }}
      >
        {SPACINGS.map((spacing) => (
          <ToggleButton key={spacing} value={spacing} sx={{ px: 2 }}>
            {spacing} mi
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  )
}

export default SpacingPicker
