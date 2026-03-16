import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function createQueryWrapper() {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    const queryClient = createTestQueryClient()
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}
