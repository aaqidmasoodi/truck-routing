import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import type { Trip } from '../api/client'
import { checkDraft, emptyDraft, latestDeparture, toLocalInput, type TripDraft } from '../tripDraft'
import PlaceSearch from './PlaceSearch'
import SpacingPicker from './SpacingPicker'

interface TripFormProps {
  loading: boolean
  onSubmit: (trip: Trip) => void
  /** Called on any edit, since old results no longer match the form. */
  onChange: () => void
}

function TripForm({ loading, onSubmit, onChange }: TripFormProps) {
  const [draft, setDraft] = useState<TripDraft>(emptyDraft)
  // The clock moves on, so this is refreshed on every edit and checked again on submit.
  const [now, setNow] = useState(() => new Date())
  const { trip, errors } = checkDraft(draft, now)

  const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setNow(new Date())
    onChange()
  }

  const swap = () => {
    setDraft((current) => ({
      ...current,
      origin: current.destination,
      destination: current.origin,
    }))
    onChange()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const latest = checkDraft(draft, new Date())
    if (latest.trip && !loading) onSubmit(latest.trip)
  }

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{ alignItems: { md: 'flex-start' } }}
      >
        <Box sx={{ flex: 1 }}>
          <PlaceSearch
            label="From"
            value={draft.origin}
            onChange={(place) => update('origin', place)}
          />
        </Box>
        <Tooltip title="Swap start and destination">
          <span>
            <IconButton
              aria-label="Swap start and destination"
              onClick={swap}
              disabled={!draft.origin && !draft.destination}
              sx={{ mt: { md: 1 }, transform: { xs: 'rotate(90deg)', md: 'none' } }}
            >
              <SwapHorizIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch
            label="To"
            value={draft.destination}
            onChange={(place) => update('destination', place)}
          />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
        <TextField
          label="Truck weight"
          value={draft.weightText}
          onChange={(event) => update('weightText', event.target.value)}
          error={Boolean(errors.weight)}
          helperText={errors.weight ?? 'Gross weight, load included'}
          sx={{ width: { xs: '100%', sm: 240 } }}
          slotProps={{
            htmlInput: { inputMode: 'numeric' },
            input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> },
          }}
        />
        <TextField
          label="Leave at"
          type="datetime-local"
          value={draft.leaveAt}
          onChange={(event) => update('leaveAt', event.target.value)}
          error={Boolean(errors.leaveAt)}
          helperText={errors.leaveAt ?? 'Leave blank to go now, or pick up to 48 h ahead'}
          sx={{ width: { xs: '100%', sm: 280 } }}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: toLocalInput(now), max: toLocalInput(latestDeparture(now)) },
          }}
        />
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mt: 1, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <SpacingPicker value={draft.spacing} onChange={(spacing) => update('spacing', spacing)} />
        <Button type="submit" variant="contained" disabled={!trip || loading} loading={loading}>
          Find routes
        </Button>
      </Stack>
    </Box>
  )
}

export default TripForm
