import Chip from '@mui/material/Chip'
import type { RiskLevel } from '../api/client'
import { useTheme } from '@mui/material/styles'
import { condition, tint } from '../conditions'

/** A level in plain words, as a soft tinted chip with darker text in the same hue. */
function RiskChip({ level }: { level: RiskLevel | null }) {
  const look = condition(level)
  const { background, text } = tint(look, useTheme().palette.mode)
  return (
    <Chip
      size="small"
      label={look.label}
      sx={{
        fontWeight: 500,
        bgcolor: background,
        color: text,
        border: 1,
        borderColor: look.colour,
        flexShrink: 0,
      }}
    />
  )
}

export default RiskChip
