---
sidebar_position: 4
---

# SSO Integration

Single Sign-On (SSO) allows you to log in to OrganizrX using existing accounts from other services. This simplifies the user experience by reducing the number of passwords to remember and providing centralized user management.

## Plex OAuth Setup

If you use Plex, you can allow your users to log in to OrganizrX using their Plex account.

1. Navigate to **Settings > Authentication > Plex**.
2. **Client ID:** Obtain this from your Plex developer portal or by creating a new OAuth app in Plex.
3. **Redirect URI:** Set this to your OrganizrX URL followed by `/api/auth/plex/callback`.
4. **Permissions:** Configure whether all Plex users or only specific servers/groups can log in.

## LDAP/Active Directory

Integrate with your local Directory Service (like OpenLDAP or Windows Active Directory) for centralized user management.

1. Go to **Settings > Authentication > LDAP**.
2. **Server URL:** The address of your LDAP server (e.g., `ldap://192.168.1.10:389`).
3. **Bind DN:** The distinguished name for the account used to search LDAP.
4. **Search Base:** The DN where user accounts are located (e.g., `ou=users,dc=example,dc=com`).
5. **Filters:** Define which users are allowed to log in (e.g., `(objectClass=person)`).
6. **Group Mapping:** Map LDAP groups to OrganizrX groups (e.g., `cn=admins,ou=groups` to Admin).

## OIDC (OpenID Connect)

OrganizrX supports modern OIDC providers like Authentik, Keycloak, PocketID, Zitadel, and Google.

1. Navigate to **Settings > Authentication > OIDC**.
2. **Issuer URL:** The discovery endpoint of your OIDC provider (e.g., `https://auth.example.com/application/o/organizrx/`).
3. **Client ID:** The unique identifier for your OrganizrX application.
4. **Client Secret:** The secure key provided by your OIDC server.
5. **Scopes:** Usually `openid`, `profile`, and `email`.
6. **Redirect URI:** Your OrganizrX URL followed by `/api/auth/oidc/callback`.

## Auth Proxy

For advanced setups behind a reverse proxy (like Authelia, Authentik, or Nginx with `auth_request`), OrganizrX can read authentication headers directly.

1. Go to **Settings > Authentication > Auth Proxy**.
2. **User Header:** The header name containing the username (default: `X-Forwarded-User`).
3. **Email Header:** (Optional) The header name containing the email (default: `X-Forwarded-Email`).
4. **Groups Header:** (Optional) The header name containing group memberships.
5. **Trusted Proxies:** Define the IP addresses of your reverse proxy for security.

## Configuration Guide

For each provider, we recommend following these steps:

1. **Verify Connectivity:** Ensure your OrganizrX instance can reach the authentication server.
2. **Test Credentials:** Use the "Test Login" feature in each provider's settings to verify your configuration.
3. **Map Groups:** Assign your SSO users to the correct OrganizrX groups to ensure they have the appropriate permissions.
4. **Enable Provider:** Once tested, enable the provider on the login page for your users.

SSO integration provides a powerful way to manage access to your media dashboard while keeping your instance secure and user-friendly.
