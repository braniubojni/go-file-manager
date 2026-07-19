import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { SnackbarHost } from '../shared/ui/SnackbarHost'
import { AppThemeProvider } from './theme'

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <AppThemeProvider>
        {children}
        <SnackbarHost />
      </AppThemeProvider>
    </QueryClientProvider>
  )
}
