import { create } from 'zustand'

export interface TabPingResult {
  reachable: boolean
  iframeAllowed: boolean
  status: number
  checkedAt: number
}

interface TabPingState {
  results: Record<number, TabPingResult>
  setResult: (tabId: number, result: TabPingResult) => void
  clear: () => void
}

export const useTabPingStore = create<TabPingState>((set) => ({
  results: {},
  setResult: (tabId, result) =>
    set((state) => ({
      results: {
        ...state.results,
        [tabId]: result,
      },
    })),
  clear: () => set({ results: {} }),
}))
