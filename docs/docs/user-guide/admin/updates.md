---
sidebar_position: 4
---

# Updates

OrganizrX is a modern, high-performance media server dashboard that is constantly being updated with new features, improvements, and bug fixes. Our flexible update system allows you to easily check for updates and upgrade your OrganizrX instance.

## Update Checker (Bell Icon in Header)

OrganizrX includes a built-in update checker that automatically checks for new updates and notifies you when they are available.

- **Check for Updates:** Click the bell icon in the header to check for new updates.
- **Notification:** If an update is available, you will receive a notification with a link to the release notes.
- **Release Notes:** View the release notes to see what's new in the latest version of OrganizrX.

## Checking for Updates Manually

If you want to check for updates manually, you can do so in the **Settings > System** page.

1. Go to **Settings > System**.
2. Click **Check for Updates**.
3. **Manual Check:** OrganizrX will check for new updates and notify you if they are available.
4. **Release Notes:** View the release notes for the latest version of OrganizrX.

## Upgrade Procedure (Docker)

To upgrade your OrganizrX instance when running in Docker, follow these steps:

1. **Pull New Image:** Pull the latest OrganizrX image from the Docker registry.
   ```bash
   docker pull organizrx:latest
   ```
2. **Stop Container:** Stop the running OrganizrX container.
   ```bash
   docker stop organizrx
   ```
3. **Remove Container:** Remove the old OrganizrX container.
   ```bash
   docker rm organizrx
   ```
4. **Start Container:** Start the new OrganizrX container with the same configuration as the old one.
   ```bash
   docker run -d \
     --name organizrx \
     -p 3001:3001 \
     -v ./data:/app/data \
     organizrx:latest
   ```

## Upgrade Procedure (Bare Metal)

To upgrade your OrganizrX instance when running on bare metal, follow these steps:

1. **Pull Changes:** Pull the latest changes from the OrganizrX repository.
   ```bash
   git pull origin main
   ```
2. **Install Dependencies:** Install any new dependencies that may have been added.
   ```bash
   bun install
   ```
3. **Rebuild:** Rebuild the OrganizrX application.
   ```bash
   bun run build
   ```
4. **Restart:** Restart the OrganizrX server.
   ```bash
   bun run start
   ```

## Rollback Strategy

If you encounter issues after upgrading your OrganizrX instance, you can easily roll back to a previous version.

1. **Restore Backup:** Use the backup and restore system to restore your OrganizrX instance to a previous state.
2. **Revert Changes:** (Bare Metal) Use git to revert to the previous commit.
   ```bash
   git checkout <commit-hash>
   ```
3. **Pull Previous Image:** (Docker) Pull the previous OrganizrX image from the Docker registry.
   ```bash
   docker pull organizrx:<previous-version>
   ```

Once the rollback procedure is complete, your OrganizrX instance will be restored to the state it was in before the upgrade.
