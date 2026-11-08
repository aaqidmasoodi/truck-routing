import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import type { Trip } from '../api/client'
import { checkDraft, emptyDraft, type TripDraft } from '../tripDraft'
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
  const { trip, errors } = checkDraft(draft)

  const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    onChange()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (trip && !loading) onSubmit(trip)
  }

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch
            label="From"
            value={draft.origin}
            onChange={(place) => update('origin', place)}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <PlaceSearch
            label="To"
            value={draft.destination}
            onChange={(place) => update('destination', place)}
          />
        </Box>
      </Stack>
      <TextField
        label="Truck weight"
        value={draft.weightText}
        onChange={(event) => update('weightText', event.target.value)}
        error={Boolean(errors.weight)}
        helperText={errors.weight ?? 'Gross weight, load included'}
        sx={{ width: { xs: '100%', sm: 260 } }}
        slotProps={{
          htmlInput: { inputMode: 'numeric' },
          input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> },
        }}
      />
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
