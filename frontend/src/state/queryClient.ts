/**
 * React Query Client - Cache and state management for API calls
 */
import { QueryClient } from '@tanstack/react-query';

// Create QueryClient instance for the application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Satellite data doesn't change frequently - keep fresh for 10 minutes
      staleTime: 10 * 60 * 1000,
      
      // Retry once for network errors (satellite APIs can be slow)
      retry: 1,
      
      // Don't auto-refetch on window focus (analyses are expensive)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Don't retry mutations (user actions should be explicit)
      retry: false,
    },
  },
});
