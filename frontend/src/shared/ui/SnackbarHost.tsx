import type { FC } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { create } from 'zustand';

type Severity = 'success' | 'error' | 'info' | 'warning';

/** Optional one-shot action rendered inside the toast (e.g. Undo delete). */
type SnackAction = { label: string; testId?: string; onClick: () => void };

type SnackOptions = { action?: SnackAction; duration?: number };

const DEFAULT_DURATION = 4000;

interface SnackState {
  open: boolean;
  message: string;
  severity: Severity;
  action: SnackAction | null;
  duration: number;
  show: (message: string, severity?: Severity, options?: SnackOptions) => void;
  hide: () => void;
}

export const useSnack = create<SnackState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  action: null,
  duration: DEFAULT_DURATION,
  show: (message, severity = 'info', options) =>
    set({
      open: true,
      message,
      severity,
      action: options?.action ?? null,
      duration: options?.duration ?? DEFAULT_DURATION,
    }),
  hide: () => set({ open: false, action: null }),
}));

export const SnackbarHost: FC = () => {
  const { open, message, severity, action, duration, hide } = useSnack();
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={hide}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        data-testid="snackbar"
        onClose={hide}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
        action={
          action ? (
            <Button
              color="inherit"
              size="small"
              data-testid={action.testId ?? 'snackbar-action'}
              onClick={() => {
                hide();
                action.onClick();
              }}
            >
              {action.label}
            </Button>
          ) : undefined
        }
      >
        {message}
      </Alert>
    </Snackbar>
  );
};
