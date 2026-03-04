---
sidebar_position: 3
---

# Backup and Restore

OrganizrX makes it easy to backup and restore your dashboard's data and configuration. Our flexible backup and restore system allows you to create manual backups of your database, which are then stored in a secure location.

## Manual Backup via Settings > System

To create a manual backup of your OrganizrX instance, navigate to **Settings > System**.

1. Click **Create Backup**.
2. **Name:** Enter a name for the backup (e.g., "Initial Setup").
3. **Backup Contents:** The backup includes a full dump of your database, including all users, tabs, categories, groups, and options.
4. **Download:** Once the backup is created, you can download it to your local machine for safekeeping.

## Backup Contents

A manual backup in OrganizrX includes a full dump of your database, which contains all the data required to restore your dashboard to a previous state.

- **Users:** All user accounts, including their usernames, emails, and group memberships.
- **Tabs:** All tabs and their configurations, including their names, URLs, icons, and permissions.
- **Categories:** All categories and their configurations, including their names, icons, and permissions.
- **Groups:** All user groups and their permissions.
- **Options:** All system settings and their values.
- **Invites:** All invite codes and their configurations.
- **Bookmarks:** All bookmarks and their configurations.

## Retention Policy

To prevent your database from growing too large, OrganizrX includes a built-in retention policy for old backups.

- **Automatic Cleanup:** Older backups are automatically deleted when the total number of backups exceeds the configured limit.
- **Configurable Limit:** You can configure the maximum number of backups to keep in the **Settings > System** page.
- **Manual Deletion:** You can also manually delete old backups at any time.

This ensures that your backup directory remains manageable and that you only keep the most recent and relevant backups.

## Restore Procedure

To restore your OrganizrX instance from a previous backup, follow these steps:

1. Go to **Settings > System**.
2. Click **Restore Backup**.
3. **Upload Backup File:** Select the backup file you want to restore from your local machine.
4. **Confirm:** Confirm that you want to restore the backup.
5. **Restart:** (Optional) If you are restoring a database dump, you may need to restart the OrganizrX application for the changes to take effect.

Once the restore procedure is complete, your dashboard will be restored to the state it was in when the backup was created.

## Database Export/Import

For advanced users, OrganizrX also supports database export and import.

- **Database Export:** Export your entire database to a SQL file for backup or migration purposes.
- **Database Import:** Import a database dump from a SQL file to restore or migrate your OrganizrX instance.

This provides a powerful way to manage your dashboard's data and configuration, ensuring that it is always safe and can be easily moved between instances.
