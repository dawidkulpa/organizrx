// ---------------------------------------------------------------------------
// Barrel re-export — all tab service functionality
// ---------------------------------------------------------------------------

export type { Tab, CreateTabData, UpdateTabData } from './crud'
export { getTabById, createTab, updateTab, deleteTab, getNextTabOrder } from './crud'

export { listTabs, reorderTabs, getTabsByCategory } from './ordering'
