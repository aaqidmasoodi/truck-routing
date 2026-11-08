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
  shape: { borderRadius: 12 },
  // Material 3 type scale: display, headline, title, body and label styles.
  typography: {
    fontFamily: "'Roboto Flex Variable', Roboto, system-ui, sans-serif",
    h1: { fontSize: '3.5625rem', lineHeight: 1.12, fontWeight: 400, letterSpacing: '-0.016em' },
    h2: { fontSize: '2.8125rem', lineHeight: 1.16, fontWeight: 400, letterSpacing: 0 },
    h3: { fontSize: '2.25rem', lineHeight: 1.22, fontWeight: 400, letterSpacing: 0 },
    h4: { fontSize: '2rem', lineHeight: 1.25, fontWeight: 400, letterSpacing: 0 },
    h5: { fontSize: '1.75rem', lineHeight: 1.29, fontWeight: 400, letterSpacing: 0 },
    h6: { fontSize: '1.375rem', lineHeight: 1.27, fontWeight: 400, letterSpacing: 0 },
    subtitle1: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.009em' },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontWeight: 500,
      letterSpacing: '0.007em',
    },
    body1: { fontSize: '1rem', lineHeight: 1.5, letterSpacing: '0.031em' },
    body2: { fontSize: '0.875rem', lineHeight: 1.43, letterSpacing: '0.018em' },
    button: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      fontWeight: 500,
      letterSpacing: '0.007em',
      textTransform: 'none',
    },
    caption: { fontSize: '0.75rem', lineHeight: 1.33, letterSpacing: '0.033em' },
    overline: {
      fontSize: '0.6875rem',
      lineHeight: 1.45,
      fontWeight: 500,
      letterSpacing: '0.045em',
      textTransform: 'none',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 20, minHeight: 40, paddingInline: 24 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 }, sizeMedium: { height: 32 } },
    },
    // Material 3 segmented buttons: pill ends, tonal fill when selected.
    MuiToggleButtonGroup: {
      styleOverrides: { root: { borderRadius: 20 } },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderColor: m3.outline,
          color: m3.onSurface,
          '&.Mui-selected, &.Mui-selected:hover': {
            backgroundColor: m3.secondaryContainer,
            color: m3.onSecondaryContainer,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 4 } },
    },
    MuiDialog: {
      styleOverrides: { paper: { borderRadius: 28, backgroundColor: m3.surfaceContainerHigh } },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: 'none',
          backgroundColor: m3.primaryContainer,
          color: m3.onPrimaryContainer,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: m3.inverseSurface,
          color: m3.inverseOnSurface,
          borderRadius: 4,
        },
      },
    },
  },
})

export default theme
