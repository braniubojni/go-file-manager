import { QueryClient } from '@tanstack/react-query';

/**
 * Single app-wide client. Exported as a module singleton (not created in a
 * component) so non-React helpers — e.g. the remote reconnect flow — can
 * invalidate queries without threading a client through props.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
