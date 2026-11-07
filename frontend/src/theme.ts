import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1565c0' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "'Roboto Flex Variable', Roboto, system-ui, sans-serif",
  },
})

export default theme
