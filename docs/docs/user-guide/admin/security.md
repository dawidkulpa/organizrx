---
sidebar_position: 2
---

# Security

OrganizrX is designed with security in mind. Our flexible security model allows you to secure your dashboard using local accounts and multi-factor authentication.

## Rate Limiting on Auth Endpoints

To prevent brute-force attacks, OrganizrX includes built-in rate limiting on all authentication endpoints.

- **Login:** Limits the number of failed login attempts from a single IP address within a short period of time.
- **Register:** Limits the number of new user registrations from a single IP address.
- **SSO:** Limits the number of SSO login attempts from a single IP address.

This ensures that your dashboard remains safe even if someone attempts to guess passwords or register unauthorized accounts.

## SSRF Protection

OrganizrX includes built-in SSRF (Server-Side Request Forgery) protection to prevent unauthorized access to internal resources.

- **Blocks Cloud Metadata:** Prevents OrganizrX from making requests to cloud metadata endpoints (e.g., `169.254.169.254`).
- **Allows Private IPs:** Allows OrganizrX to make requests to private IP addresses (e.g., `192.168.1.1`), which is required for home-lab setups.
- **Restricted Schemes:** Blocks non-HTTP schemes (e.g., `file://`, `ftp://`).

This ensures that your dashboard remains secure even if it is accessed from the public internet.

## Input Validation

All API endpoints in OrganizrX are protected by Zod runtime schema validation.

- **Schema Validation:** Ensures that all input to the API follows a strict schema, preventing common security vulnerabilities like SQL injection and cross-site scripting (XSS).
- **Type Safety:** Provides type-safe validation for all input, making it easier to catch errors and maintain the security of your dashboard.

This ensures that your dashboard remains secure and reliable, even if someone attempts to send malicious input to the API.

## Password Hashing

All passwords in OrganizrX are hashed using the **bcrypt** algorithm with a minimum of 12 rounds.

- **Secure Storage:** Ensures that even if your database is compromised, user credentials remain safe.
- **Algorithm Strength:** bcrypt is a strong and widely-used hashing algorithm that is resistant to brute-force and rainbow table attacks.

This ensures that your user accounts remain secure, even if someone attempts to guess passwords or compromise your database.

## JWT Security

OrganizrX uses secure JSON Web Tokens (JWTs) for authentication.

- **RS256/HS256:** Supports both RS256 (asymmetric) and HS256 (symmetric) signing algorithms for maximum security.
- **No Algorithm "None":** Explicitly forbids the use of the `none` algorithm, which is a common security vulnerability in JWT implementations.
- **Short-Lived Access Tokens:** Uses short-lived access tokens (15 minutes) for API requests, reducing the risk of token theft.
- **HttpOnly Refresh Tokens:** Uses `httpOnly` refresh tokens stored in secure cookies for seamless session persistence and automatic token rotation.

This ensures that your dashboard remains secure and that user sessions are protected from common attacks like session hijacking.

## CORS Configuration

OrganizrX includes built-in CORS (Cross-Origin Resource Sharing) configuration to prevent unauthorized access to your dashboard.

- **Explicit Origin Whitelist:** Allows you to define an explicit whitelist of allowed origins for your dashboard.
- **No `*` in Production:** Explicitly forbids the use of the `*` wildcard in production, which is a common security vulnerability.
- **Preflight Requests:** Supports CORS preflight requests for security.

This ensures that your dashboard remains secure and that cross-origin requests are only allowed from trusted sources.
