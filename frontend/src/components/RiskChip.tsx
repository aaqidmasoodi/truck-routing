import Chip from '@mui/material/Chip'
import type { RiskLevel } from '../api/client'

interface RiskChipProps {
  level: RiskLevel | null
}

function RiskChip({ level }: RiskChipProps) {
  if (!level) return <Chip size="small" variant="outlined" label="Unknown" />
  return (
    <Chip
      size="small"
      label={level.label}
      sx={(theme) => ({
        fontWeight: 500,
        bgcolor: theme.palette.risk[level.value]?.main,
        color: theme.palette.risk[level.value]?.contrastText,
      })}
    />
  )
}

export default RiskChip
