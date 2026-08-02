import { QueryClientProvider } from '@tanstack/react-query';
import { type FC, type ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { queryClient } from '../shared/api/queryClient';
import { ErrorBoundary, GlobalErrorHost } from '../shared/ui/ErrorBoundary';
import { SnackbarHost } from '../shared/ui/SnackbarHost';
import { FileDragLayer } from '../widgets/file-pane/FileDragLayer';
import { AppThemeProvider } from './theme';

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        Pointer backend, not HTML5: native OS drag swallows keydown/keyup in
        WKWebView, so ⌘ mid-drag (copy → move) could never be observed.
        OS/Finder drops are handled by Wails events, not react-dnd.
      */}
      <DndProvider backend={TouchBackend} options={{ enableMouseEvents: true, touchSlop: 6 }}>
        <AppThemeProvider>
          <ErrorBoundary>
            <GlobalErrorHost>
              {children}
              <FileDragLayer />
              <SnackbarHost />
            </GlobalErrorHost>
          </ErrorBoundary>
        </AppThemeProvider>
      </DndProvider>
    </QueryClientProvider>
  );
};
