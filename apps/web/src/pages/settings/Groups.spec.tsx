import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SettingsGroups from './Groups'
import { api } from '../../api/client'

vi.mock('../../api/client', () => ({
  api: {
    groups: {
      getAll: vi.fn(),
    },
    users: {
      getAll: vi.fn(),
    },
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

const mockGroups = [
  { id: 1, name: 'Admins', group_id: 1, image: null, isDefault: null },
  { id: 2, name: 'Users', group_id: 2, image: null, isDefault: null },
]

const mockUsers = [
  { id: 1, group_id: 1 },
  { id: 2, group_id: 1 },
  { id: 3, group_id: 2 },
]

function createTestQueryClient() {
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

function createTestWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const queryClient = createTestQueryClient()
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('SettingsGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.groups.getAll as any).mockResolvedValue({
      data: { data: mockGroups },
    })
    ;(api.users.getAll as any).mockResolvedValue({
      data: { data: mockUsers },
    })
  })

  it('renders groups from query data', async () => {
    const { container } = render(<SettingsGroups />, { wrapper: createTestWrapper() })

    await waitFor(() => {
      const groupName = container.querySelector('h4')
      expect(groupName?.textContent).toBe('Admins')
    })

    expect(api.groups.getAll).toHaveBeenCalled()
    expect(api.users.getAll).toHaveBeenCalled()
  })

  it('displays member count for each group', async () => {
    const { container } = render(<SettingsGroups />, { wrapper: createTestWrapper() })

    await waitFor(() => {
      const memberText = Array.from(container.querySelectorAll('p')).find((p) =>
        p.textContent?.includes('members')
      )
      expect(memberText).toBeDefined()
    })
  })

  it('shows loading state initially', () => {
    ;(api.groups.getAll as any).mockImplementation(() => new Promise(() => {}))

    const { container } = render(<SettingsGroups />, { wrapper: createTestWrapper() })

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
