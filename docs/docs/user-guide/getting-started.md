---
sidebar_position: 3
---

# Getting Started

Once you have OrganizrX installed and running, you are ready to configure your dashboard. This guide will walk you through the initial setup and your first few tasks.

## First-Run Wizard

When you access OrganizrX for the first time (typically at `http://localhost:3001`), you will be greeted by the Setup Wizard. This process ensures your instance is correctly configured before you start using it.

### 1. Database Configuration

If you haven't specified a database via environment variables, the wizard will ask you to provide connection details for your chosen database (SQLite, MySQL, or PostgreSQL).

### 2. Administrator Account

Create your primary administrator account. This user will have full control over the instance. You will need to provide:

- Username
- Email address
- A strong password

### 3. Site Settings

Configure basic information about your instance:

- **Site Title:** The name displayed in the browser tab and header.
- **Site URL:** The external URL where OrganizrX is accessible.

## Adding Your First Tabs

Tabs are the core of the OrganizrX experience. They allow you to link to all your services in one place.

1. Navigate to **Settings > Tabs**.
2. Click **Add Tab**.
3. **Name:** Enter the display name (e.g., Plex, Sonarr).
4. **URL:** Enter the address of the service.
5. **Local URL:** (Optional) Enter the internal network address for faster access when on-site.
6. **Tab Type:**
   - **Iframe:** The service opens inside the OrganizrX interface (best for most modern web apps).
   - **New Tab:** The service opens in a separate browser tab.
7. **Icon:** Choose an icon from the library or provide a custom URL.
8. **Permissions:** Select which user groups can see this tab.

## Organizing with Categories

As you add more services, categories help keep your sidebar tidy.

1. Go to **Settings > Categories**.
2. Create categories like "Media," "Downloaders," or "System."
3. Back in **Settings > Tabs**, assign each tab to a category.
4. Drag and drop tabs and categories to change their order in the sidebar.

## Configuring the Homepage

The homepage is the first thing you and your users see. You can customize it with widgets provided by plugins.

1. Navigate to **Settings > Plugins**.
2. Enable the plugins for the services you use (e.g., Plex, Sonarr).
3. Go to **Settings > Homepage**.
4. Drag widgets into the layout grid.
5. Resize and reorder them to suit your preference.

Each widget will provide at-a-glance information, such as recently added movies, active downloads, or system health.
