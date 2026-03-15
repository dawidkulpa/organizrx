# Spec: Authentik OIDC Integration Test Plan

## Overview
This document defines the testing strategy and design for integrating Authentik OIDC into a TypeScript/Hono application. The goal is to ensure high confidence in the authentication flow while maintaining fast feedback loops for developers.

## Architecture & Testing Layers
We employ a **three-tier testing strategy**:

1.  **Unit Layer (Stateless JWT)**:
    - **Focus**: Middleware logic, claim parsing, and error handling.
    - **Mechanism**: Local generation of RS256-signed JWTs using `jose`.
    - **Mocking**: Inject pre-signed tokens into Hono request context.
    - **Scenarios**: Expired tokens, missing `groups`, invalid signatures, audience mismatch.

2.  **Integration Layer (OIDC Mock Server)**:
    - **Focus**: Protocol handshake (Authorization Code flow).
    - **Mechanism**: Lightweight mock OIDC provider (e.g., `oidc-provider-mock`).
    - **Verification**: Correct code-to-token exchange, redirect URI handling, and session establishment.

3.  **Smoke Layer (Authentik Testcontainer)**:
    - **Focus**: Production-parity and configuration verification.
    - **Mechanism**: Minimal Authentik instance running in Docker via `Testcontainers`.
    - **Verification**: Discovery URL structure, JWKS endpoint reachability, and custom property mappings (Blueprints).

## Components
- **`MockTokenGenerator`**: Utility to sign and encode JWTs with custom claims for tests.
- **`OidcMockProvider`**: Node.js/Bun based mock server for OIDC endpoints.
- **`AuthentikBlueprint`**: Declarative configuration for the Testcontainer provider/application.

## Common Authentik Pitfalls to Test
- **Redirect URI Mismatches**: Verify `http` vs `https` handling in proxy environments.
- **JWT Signing Keys**: Ensure the app fetches and caches JWKS correctly from the Authentik sub-path.
- **Scope Mappings**: Validate that `goauthentik.io/groups` and other custom claims are correctly returned.

## Testing Flow
1. **Initialize**: Start mock OIDC server or Authentik container.
2. **Handshake**: Hono initiates `/login` -> Redirect to Provider -> Callback with `code`.
3. **Validation**: Hono exchanges `code` for `access_token` and `id_token`.
4. **Session**: Hono validates JWT signature and claims, then persists session.

## Error Handling Scenarios
- Authentik returns `error=access_denied` during authorization.
- Token endpoint returns `401 Unauthorized`.
- JWKS endpoint is unreachable (startup timeout).
