import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type FC, type ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ErrorBoundary, GlobalErrorHost } from '../shared/ui/ErrorBoundary';
import { SnackbarHost } from '../shared/ui/SnackbarHost';
import { AppThemeProvider } from './theme';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
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
  );

  return (
    <QueryClientProvider client={client}>
      <DndProvider backend={HTML5Backend}>
        <AppThemeProvider>
          <ErrorBoundary>
            <GlobalErrorHost>
              {children}
              <SnackbarHost />
            </GlobalErrorHost>
          </ErrorBoundary>
        </AppThemeProvider>
      </DndProvider>
    </QueryClientProvider>
  );
};
