import { useMemo, useState } from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import useMediaQuery from '@mui/material/useMediaQuery'
import { ThemeProvider } from '@mui/material/styles'
import App from './App'
import { makeTheme } from './theme'

/** The visitor's choice: follow the device, or always light or dark. */
export type ThemeChoice = 'system' | 'light' | 'dark'

const KEY = 'truck-routing:theme'
const ORDER: ThemeChoice[] = ['system', 'light', 'dark']

function savedChoice(): ThemeChoice {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

/** Picks the theme (following the device unless the visitor chose) and renders the app. */
function Root() {
  const deviceIsDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true })
  const [choice, setChoice] = useState<ThemeChoice>(savedChoice)
  const mode = choice === 'system' ? (deviceIsDark ? 'dark' : 'light') : choice
  const theme = useMemo(() => makeTheme(mode), [mode])

  const nextChoice = () => {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length]!
    setChoice(next)
    try {
      if (next === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, next)
    } catch {
      // Storage blocked: the choice still holds until the page is closed.
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App themeChoice={choice} onThemeChange={nextChoice} />
    </ThemeProvider>
  )
}

export default Root
