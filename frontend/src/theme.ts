import { createTheme } from '@mui/material/styles'
import { buildColorScheme, type ColorScheme } from './colorScheme'

declare module '@mui/material/styles' {
  interface Palette {
    m3: ColorScheme
  }
  interface PaletteOptions {
    m3?: ColorScheme
  }
}

const SEED = '#0b57d0'
const m3 = buildColorScheme(SEED)

const theme = createTheme({
  palette: {
    mode: 'light',
    m3,
    primary: { main: m3.primary, contrastText: m3.onPrimary },
    secondary: { main: m3.secondary, contrastText: m3.onSecondary },
    error: { main: m3.error, contrastText: m3.onError },
    background: { default: m3.surface, paper: m3.surfaceContainerLow },
    text: { primary: m3.onSurface, secondary: m3.onSurfaceVariant },
    divider: m3.outlineVariant,
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "'Roboto Flex Variable', Roboto, system-ui, sans-serif",
  },
})

export default theme
