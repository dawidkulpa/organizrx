---
sidebar_position: 2
---

# Users and Groups

OrganizrX provides a robust user management system that allows you to control access to your dashboard and its services based on a hierarchical group model.

## User Management

To manage your users, navigate to **Settings > Users**.

- **Create User:** Manually add new accounts by providing a username, email, and password.
- **Edit User:** Update user details, change their group, or reset their password.
- **Delete User:** Permanently remove an account.
- **Lock/Unlock Account:** Temporarily disable access without deleting the user's data.

Each user account includes essential details such as:

- **Username:** A unique name for logging in.
- **Email:** Used for password resets and system notifications.
- **Join Date:** Track how long each user has been a member.
- **Group:** The user's role and permission level.

## Group Hierarchy

OrganizrX uses a numerical ID system to manage group permissions. A lower ID indicates a higher level of access.

| Group Name     | ID  | Description                                                       |
| :------------- | :-- | :---------------------------------------------------------------- |
| **Admin**      | 0   | Full access to all settings, users, and services.                 |
| **Co-Admin**   | 1   | Most administrative access, excluding critical system settings.   |
| **Super User** | 2   | Higher-level user with access to more advanced tabs and features. |
| **Power User** | 3   | Regular user with some additional permissions.                    |
| **User**       | 4   | Standard account with basic tab access.                           |
| **Guest**      | 999 | Minimal access, typically for public or shared links.             |

## Permission Model

Permissions in OrganizrX are inherited downwards. This means an Admin (0) can access everything that a Power User (3) can, but not vice versa.

- **Tab Access:** Control which groups can see each tab.
- **Category Access:** Hide entire groups of services from specific users.
- **Admin Pages:** Access to settings and logs is restricted to Admins and Co-Admins.

## Invite System

The invite system simplifies user onboarding by allowing you to generate secure links for new members to register themselves.

1. Navigate to **Settings > Invites**.
2. **Create Invite:** Generate a unique code.
3. **Limit:** Set a maximum number of uses for the code.
4. **Expiry:** Set an expiration date for the invite.
5. **Group:** Choose which group the new user will be assigned to upon registration.
6. **Email:** (Optional) Send the invite code directly to a user's email.

Using invites ensures that only authorized people can create accounts on your instance while maintaining control over their initial permissions.
