import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import type { Spacing } from '../api/client'

const SPACINGS: Spacing[] = [10, 25, 50]

interface SpacingPickerProps {
  value: Spacing
  onChange: (spacing: Spacing) => void
  /** One short row for a phone, instead of a label over full-width buttons. */
  compact?: boolean
}

function SpacingPicker({ value, onChange, compact = false }: SpacingPickerProps) {
  return (
    <Stack
      direction={compact ? 'row' : 'column'}
      spacing={compact ? 1.5 : 1}
      sx={{ alignItems: compact ? 'center' : 'stretch' }}
    >
      <Typography id="spacing-label" variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
        Check weather every
      </Typography>
      <ToggleButtonGroup
        aria-labelledby="spacing-label"
        exclusive
        fullWidth
        size={compact ? 'small' : 'medium'}
        value={value}
        onChange={(_event, spacing: Spacing | null) => {
          // Clicking the selected option again would clear it, so ignore that.
          if (spacing !== null) onChange(spacing)
        }}
        sx={{ '& .MuiToggleButton-root': { py: compact ? 0.5 : 0.75 } }}
      >
        {SPACINGS.map((spacing) => (
          <ToggleButton key={spacing} value={spacing}>
            {spacing} mi
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  )
}

export default SpacingPicker
