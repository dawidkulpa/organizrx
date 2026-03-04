---
sidebar_position: 7
---

# Migration Guide

OrganizrX is designed to be a modern, high-performance successor to the original Organizr. To make the transition as smooth as possible, we include built-in migration support for your existing Organizr v2 instance.

## Migration Overview (Organizr v2 -> OrganizrX)

When you migrate from Organizr v2 to OrganizrX, your essential data and configuration are preserved. This includes:

- **User Accounts:** All your user accounts and their group memberships are migrated.
- **Tabs and Categories:** Your tabs and categories are preserved and automatically migrated to the new system.
- **Groups:** Your user groups and their permissions are migrated.
- **System Settings:** Most of your system settings are migrated, with a few exceptions where the new system differs from the old one.

## What Changes

While we strive to preserve as much data as possible, there are some changes in the new OrganizrX system:

- **New URL Paths:** The API endpoints and internal paths in OrganizrX differ from the original Organizr.
- **New API:** The new API is written in TypeScript and uses a modern RESTful design.
- **New Plugin System:** The plugin system in OrganizrX is completely rebuilt for better performance and flexibility.
- **TypeScript Backend:** The backend is now written in TypeScript and runs on the high-performance Bun runtime.

## Step-by-Step Migration Procedure

To migrate from Organizr v2 to OrganizrX, follow these steps:

1. **Backup Your Existing Database:** Before starting the migration, ensure you have a full backup of your existing Organizr v2 database.
2. **Point OrganizrX to the Same Database:** Set the `DATABASE_DIALECT` and `DATABASE_URL` environment variables in OrganizrX to point to your existing database.
3. **Start OrganizrX:** Start your OrganizrX instance. The system will automatically detect the old schema version.
4. **Migration Wizard Appears:** A migration wizard will appear, confirming the changes that will be made to your database.
5. **Schema Migrated In-Place:** OrganizrX will migrate your schema in-place, adding new columns and tables where required (e.g., TOTP for 2FA).
6. **Verify Data:** Once the migration is complete, verify that all your users, tabs, and groups have been correctly migrated.

## Manual Migration Fallback

If you encounter issues during the automatic migration, you can also perform a manual migration by following these steps:

1. **Export Data:** Export your users, tabs, and groups from your existing Organizr v2 database to a CSV or SQL file.
2. **Import Data:** Use the database export/import system in OrganizrX to import your data into the new system.

## Rollback Plan

If you encounter issues after the migration, you can easily roll back to your previous Organizr v2 instance:

1. **Restore From Backup:** Use the backup you created in step 1 to restore your existing Organizr v2 database.
2. **Start Organizr v2:** Start your previous Organizr v2 instance.

## Data Verification Checklist

After the migration is complete, we recommend using this checklist to verify that your data has been correctly migrated:

- **Users:** Verify that all your user accounts have been migrated and that their group memberships are correct.
- **Tabs:** Verify that all your tabs have been migrated and that their URLs and icons are correct.
- **Groups:** Verify that all your user groups have been migrated and that their permissions are correct.
- **Settings:** Verify that your system settings have been correctly migrated.

Migration support in OrganizrX ensures that you can move to the new system while preserving your essential data and configuration.
