import type { FC } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { create } from 'zustand';

type Severity = 'success' | 'error' | 'info' | 'warning';

interface SnackState {
  open: boolean;
  message: string;
  severity: Severity;
  show: (message: string, severity?: Severity) => void;
  hide: () => void;
}

export const useSnack = create<SnackState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  show: (message, severity = 'info') => set({ open: true, message, severity }),
  hide: () => set({ open: false }),
}));

export const SnackbarHost: FC = () => {
  const { open, message, severity, hide } = useSnack();
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={hide}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        data-testid="snackbar"
        onClose={hide}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
