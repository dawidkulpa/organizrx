---
sidebar_position: 1
---

# System Settings

System Settings in OrganizrX allow you to configure and manage the core functionality of your dashboard. These settings are stored in the database and control everything from the site title to the database dialect.

## All Settings Categories

The system settings are organized into categories for easy navigation.

- **General:** Configure basic site information, such as the site title, URL, and timezone.
- **Authentication:** Manage local authentication, Plex OAuth, LDAP, OIDC, and Auth Proxy settings.
- **Plugins:** Enable and configure plugins for the services you use.
- **Users:** Create, edit, and delete user accounts.
- **Groups:** Manage user group hierarchy and permissions.
- **Tabs:** Create and organize tabs for your dashboard.
- **Categories:** Group related tabs for better organization.
- **Invites:** Generate secure links for new user registration.
- **Bookmarks:** Manage bookmarks for your dashboard.
- **System:** Configure core system settings, such as database dialect and URL.

## Settings Stored in DB Options Table

Most system settings are stored in the `options` table of your database. This allows you to easily backup and restore your configuration.

- **Option Name:** The unique identifier for the setting.
- **Option Value:** The value of the setting (e.g., site title, database dialect).

When you update a setting in the OrganizrX interface, it is automatically updated in the `options` table.

## Runtime vs Startup Configuration

Some settings can be configured at runtime, while others require a restart of the OrganizrX application.

- **Runtime Configuration:** Settings that can be updated in the interface and take effect immediately, such as site title and theme.
- **Startup Configuration:** Settings that are required for the application to start, such as database dialect and URL. These settings are typically configured via environment variables.

By providing both runtime and startup configuration options, OrganizrX gives you the flexibility to manage your dashboard's settings in the way that best suits your needs.

## Backup and Restore Settings

You can easily backup and restore your system settings from the **Settings > System** page.

- **Manual Backup:** Create a full backup of your database, including all system settings.
- **Restore Procedure:** Upload a backup file to restore your settings to a previous state.

This ensures that your configuration is always safe and can be easily recovered in the event of a system failure or data loss.
