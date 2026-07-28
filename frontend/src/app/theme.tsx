import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { useSettings } from '../entities/file/queries';
import type { ThemePreference } from '../entities/file/types';

const useSystemDark = (): boolean => {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return dark;
};

const resolveMode = (pref: ThemePreference, systemDark: boolean): 'light' | 'dark' => {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemDark ? 'dark' : 'light';
};

export const AppThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { data: settings } = useSettings();
  const pref: ThemePreference = settings?.theme ?? 'system';
  const systemDark = useSystemDark();
  const mode = resolveMode(pref, systemDark);

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
          MuiTextField: {
            defaultProps: {
              spellCheck: false,
              autoCorrect: 'off',
              autoCapitalize: 'off',
              autoComplete: 'off',
            },
          },
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
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};
