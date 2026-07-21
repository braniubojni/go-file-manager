import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Component, useEffect, useState, type ErrorInfo, type FC, type ReactNode } from 'react'

type BoundaryState = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React error boundary:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorRecovery message={this.state.error.message} />
    }
    return this.props.children
  }
}

/** Catches window error / unhandledrejection and shows the same recovery UI. */
export const GlobalErrorHost: FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Ignore benign resource load failures (e.g. missing custom.js in server mode)
      if (e.message === 'Script error.' && !e.filename) return
      if (e.message?.includes('ResizeObserver')) return
      setError(e.message || 'Unexpected error')
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection'
      // DataGrid multi-select was a crash; still surface other rejections that break UX
      if (msg.includes('rowSelectionModel can only contain 1 item')) {
        setError(msg)
        return
      }
      // Non-fatal network noise: log only
      if (msg.includes('Failed to fetch') || msg.includes('Load failed')) {
        console.warn('Unhandled rejection:', msg)
        return
      }
      setError(msg)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (error) {
    return <ErrorRecovery message={error} onDismiss={() => setError(null)} />
  }
  return <>{children}</>
}

const ErrorRecovery = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => {
  const refresh = () => {
    window.location.reload()
  }

  return (
    <Box
      data-testid="global-error-recovery"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Box
        sx={{
          maxWidth: 480,
          width: '100%',
          p: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" gutterBottom>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: 'break-word' }}>
          {message || 'An unexpected error occurred.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={refresh}
            data-testid="btn-error-refresh"
          >
            Refresh
          </Button>
          {onDismiss && (
            <Button variant="outlined" onClick={onDismiss} data-testid="btn-error-dismiss">
              Dismiss
            </Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Refresh reloads the app (same as Cmd/Ctrl+R).
        </Typography>
      </Box>
    </Box>
  )
}
