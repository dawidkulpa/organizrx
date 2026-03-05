// ---------------------------------------------------------------------------
// OIDC state/nonce management — in-memory PKCE/state store with TTL cleanup
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OidcAuthState {
  codeVerifier: string
  state: string
  nonce: string
  createdAt: number
}

// ---------------------------------------------------------------------------
// In-memory PKCE/state store with TTL cleanup
// ---------------------------------------------------------------------------

const STATE_TTL_MS = 600_000 // 10 minutes
const oidcStateStore = new Map<string, OidcAuthState>()

function cleanupExpiredStates(): void {
  const now = Date.now()
  for (const [key, entry] of oidcStateStore) {
    if (now - entry.createdAt > STATE_TTL_MS) {
      oidcStateStore.delete(key)
    }
  }
}

export function storeOidcState(state: string, entry: OidcAuthState): void {
  cleanupExpiredStates()
  oidcStateStore.set(state, entry)
}

export function retrieveAndDeleteOidcState(state: string): OidcAuthState | null {
  cleanupExpiredStates()
  const entry = oidcStateStore.get(state)
  if (!entry) return null
  oidcStateStore.delete(state)
  return entry
}

export function _resetOidcStateStore(): void {
  oidcStateStore.clear()
}
