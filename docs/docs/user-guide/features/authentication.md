---
sidebar_position: 3
---

# Authentication

Security is at the heart of OrganizrX. Our flexible authentication system allows you to secure your dashboard using local accounts and multi-factor authentication.

## Local Authentication

Local authentication is the standard username and password model. It is the most common way to secure your OrganizrX instance.

- **Password Requirements:** passwords must be at least 8 characters long and should contain a mix of uppercase letters, lowercase letters, numbers, and symbols for maximum security.
- **Secure Storage:** All passwords are hashed using **bcrypt** with a minimum of 12 rounds, ensuring that even if your database is compromised, user credentials remain safe.
- **Session Management:** OrganizrX uses a dual-token system for session security:
  - **Access Tokens:** Short-lived tokens stored in memory (valid for 15 minutes) for API requests.
  - **Refresh Tokens:** Long-lived tokens stored in secure, `httpOnly` cookies for seamless session persistence and automatic token rotation.

## Two-Factor Authentication (2FA)

Enhance your account's security by enabling Two-Factor Authentication. This adds an extra layer of protection, requiring a one-time code from an authenticator app.

1. Navigate to **User Settings > Security**.
2. Click **Enable 2FA**.
3. **Scan the QR Code:** Use a standard authenticator app (like Google Authenticator, Authy, or Bitwarden) to scan the provided code.
4. **Enter Verification Code:** Type the 6-digit code from your app to confirm the setup.
5. **Backup Codes:** Save the generated backup codes in a safe place. You will need these if you lose access to your authenticator app.
6. **Recovery:** If you are locked out, you can use a backup code or have an administrator disable 2FA for your account.

OrganizrX uses the **TOTP** (Time-Based One-Time Password) algorithm, which is compatible with most modern 2FA apps.

## Account Recovery

If you forget your password or lose access to your account:

- **Admin Reset:** A user with administrator privileges can reset your password or disable 2FA from the **Settings > Users** page.
- **Email Recovery:** (Coming soon) If you have configured an SMTP server, you will be able to request a password reset link via email.

By combining strong local authentication with multi-factor security, OrganizrX ensures that your media dashboard remains private and protected.
