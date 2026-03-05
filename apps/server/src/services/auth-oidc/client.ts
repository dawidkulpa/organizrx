// ---------------------------------------------------------------------------
// OIDC client initialisation, discovery, and token exchange
// ---------------------------------------------------------------------------

import * as client from 'openid-client'

import { getSettingString, getSettingBoolean, getSettingNumber, getSettingJSON } from '../settings'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OidcConfig {
  enabled: boolean
  providerUrl: string
  clientId: string
  clientSecret: string
  scopes: string
  redirectUri: string
  groupClaim: string
  groupMapping: Record<string, number>
  autoCreateUser: boolean
  defaultGroupId: number
}

export interface OidcAuthUrlResult {
  url: string
  state: string
  codeVerifier: string
  nonce: string
}

export interface OidcTokenResult {
  claims: Record<string, unknown>
  accessToken: string
}

// ---------------------------------------------------------------------------
// OIDC configuration loader
// ---------------------------------------------------------------------------

export async function getOidcConfig(): Promise<OidcConfig> {
  const [
    enabled,
    providerUrl,
    clientId,
    clientSecret,
    scopes,
    redirectUri,
    groupClaim,
    groupMapping,
    autoCreateUser,
    defaultGroupId,
  ] = await Promise.all([
    getSettingBoolean('oidc_enabled', false),
    getSettingString('oidc_provider_url', ''),
    getSettingString('oidc_client_id', ''),
    getSettingString('oidc_client_secret', ''),
    getSettingString('oidc_scopes', 'openid profile email'),
    getSettingString('oidc_redirect_uri', ''),
    getSettingString('oidc_group_claim', 'groups'),
    getSettingJSON<Record<string, number>>('oidc_group_mapping', {}),
    getSettingBoolean('oidc_auto_create_user', true),
    getSettingNumber('oidc_default_group_id', 4),
  ])

  return {
    enabled,
    providerUrl,
    clientId,
    clientSecret,
    scopes,
    redirectUri,
    groupClaim,
    groupMapping,
    autoCreateUser,
    defaultGroupId,
  }
}

// ---------------------------------------------------------------------------
// OIDC Discovery
// ---------------------------------------------------------------------------

export async function discoverOidcProvider(
  issuerUrl: string,
  clientId: string,
  clientSecret: string
): Promise<client.Configuration> {
  const config = await client.discovery(new URL(issuerUrl), clientId, clientSecret)
  return config
}

// ---------------------------------------------------------------------------
// Build Authorization URL with PKCE
// ---------------------------------------------------------------------------

export async function buildOidcAuthUrl(
  config: client.Configuration,
  redirectUri: string,
  scopes: string
): Promise<OidcAuthUrlResult> {
  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()
  const nonce = client.randomNonce()

  const parameters: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  }

  const redirectTo = client.buildAuthorizationUrl(config, parameters)

  return {
    url: redirectTo.href,
    state,
    codeVerifier,
    nonce,
  }
}

// ---------------------------------------------------------------------------
// Exchange authorization code for tokens
// ---------------------------------------------------------------------------

export async function exchangeOidcCode(
  config: client.Configuration,
  callbackUrl: URL,
  codeVerifier: string,
  expectedState: string,
  expectedNonce: string
): Promise<OidcTokenResult> {
  const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
    pkceCodeVerifier: codeVerifier,
    expectedState,
    expectedNonce,
    idTokenExpected: true,
  })

  const claims = tokens.claims()
  if (!claims) {
    throw new Error('No ID token claims received from OIDC provider')
  }

  return {
    claims: claims as Record<string, unknown>,
    accessToken: tokens.access_token,
  }
}
