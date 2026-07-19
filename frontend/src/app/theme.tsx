import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { useMemo, type ReactNode } from 'react'
import { useThemeSetting } from '../entities/file/queries'

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const { data: mode = 'dark' } = useThemeSetting()

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: mode === 'dark' ? '#90caf9' : '#1565c0' },
          background: {
            default: mode === 'dark' ? '#121212' : '#f5f5f5',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          fontSize: 13,
        },
        components: {
          MuiButton: { defaultProps: { size: 'small' } },
          MuiIconButton: { defaultProps: { size: 'small' } },
          MuiCssBaseline: {
            styleOverrides: {
              html: { height: '100%' },
              body: {
                height: '100%',
                margin: 0,
                overflow: 'hidden',
              },
              '#root': { height: '100%' },
            },
          },
        },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}
