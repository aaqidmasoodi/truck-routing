import { useEffect, useState } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import { searchPlaces, type Place } from '../api/client'
import { debug } from '../debug'

interface PlaceSearchProps {
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
}

interface SearchResult {
  query: string
  places: Place[]
  failed: boolean
}

const MIN_LETTERS = 2

function PlaceSearch({ label, value, onChange }: PlaceSearchProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<SearchResult>({ query: '', places: [], failed: false })

  const query = input.trim()
  const ready = query.length >= MIN_LETTERS

  useEffect(() => {
    if (!ready) return

    const controller = new AbortController()
    searchPlaces(query, controller.signal)
      .then((places) => setResult({ query, places, failed: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        debug('places', 'search failed', query, error)
        setResult({ query, places: [], failed: true })
      })
    return () => controller.abort()
  }, [query, ready])

  const loading = ready && result.query !== query
  const failed = ready && !loading && result.failed

  return (
    <Autocomplete
      options={ready ? result.places : []}
      value={value}
      onChange={(_event, place) => onChange(place)}
      onInputChange={(_event, text) => setInput(text)}
      getOptionLabel={(place) => place.display_name}
      isOptionEqualToValue={(a, b) => a.latitude === b.latitude && a.longitude === b.longitude}
      filterOptions={(places) => places}
      loading={loading}
      noOptionsText={ready ? 'No places found' : 'Type at least 2 letters'}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={failed}
          helperText={failed ? 'Place search is unavailable right now' : ' '}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  )
}

export default PlaceSearch
