import Chip from '@mui/material/Chip'
import type { RiskLevel } from '../api/client'
import { condition } from '../conditions'

/** A level in plain words, as a soft tinted chip with darker text in the same hue. */
function RiskChip({ level }: { level: RiskLevel | null }) {
  const { label, colour, container, onContainer } = condition(level)
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        fontWeight: 500,
        bgcolor: container,
        color: onContainer,
        border: 1,
        borderColor: colour,
        flexShrink: 0,
      }}
    />
  )
}

export default RiskChip
