export const queryKeys = {
  tabs: {
    all: ['tabs'] as const,
    sidebar: ['tabs', 'sidebar'] as const,
    detail: (id: number) => ['tabs', 'detail', id] as const,
  },
  users: {
    all: ['users'] as const,
  },
  groups: {
    all: ['groups'] as const,
  },
  settings: {
    all: (key: string) => ['settings', key] as const,
    public: ['settings', 'public'] as const,
  },
  plugins: {
    all: ['plugins'] as const,
  },
  invites: {
    all: ['invites'] as const,
    verify: (code: string) => ['invites', 'verify', code] as const,
  },
  update: {
    check: ['update', 'check'] as const,
  },
  dashboard: {
    layout: ['dashboard', 'layout'] as const,
  },
}
