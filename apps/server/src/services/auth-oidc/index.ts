// ---------------------------------------------------------------------------
// Barrel re-export — all OIDC auth functionality
// ---------------------------------------------------------------------------

export type { OidcAuthState } from './state'
export { storeOidcState, retrieveAndDeleteOidcState, _resetOidcStateStore } from './state'

export type { OidcConfig, OidcAuthUrlResult, OidcTokenResult } from './client'
export { getOidcConfig, discoverOidcProvider, buildOidcAuthUrl, exchangeOidcCode } from './client'

export type { OidcUserInfo } from './mapping'
export { mapOidcGroupsToOrganizr, extractOidcUserInfo, getGroupNameById } from './mapping'

export { findOrCreateOidcUser, linkOidcAccount } from './db'
