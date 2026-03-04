---
sidebar_position: 1
---

# Tabs and Categories

Tabs are the primary way users interact with services in OrganizrX. They provide the structure for your dashboard by linking to external applications and internal tools.

## Creating Tabs

To manage your tabs, navigate to **Settings > Tabs**.

1. Click **Add Tab**.
2. **Name:** The label that will appear in the sidebar.
3. **URL:** The public URL of the service.
4. **Local URL:** An optional internal URL. OrganizrX will attempt to use this URL if it is accessible from the user's current network, improving speed and reliability.
5. **Tab Type:**
   - **Iframe:** Opens the service directly within the OrganizrX interface. This provides a seamless "single app" experience. Note that some services may block being displayed in an iframe for security reasons (see Troubleshooting).
   - **Internal:** Used for built-in OrganizrX pages like the Homepage, Users, or Logs.
   - **New Tab:** Opens the link in a fresh browser tab.

## Tab Categories

As you add more services, you can group them into categories for better organization.

1. Go to **Settings > Categories**.
2. Click **Create Category**.
3. **Name:** The title of the group (e.g., Media, Downloads).
4. **Icon:** Assign an icon to represent the category.
5. In **Settings > Tabs**, edit a tab to assign it to your new category.

Categories can be collapsed in the sidebar, allowing users to quickly find what they need while keeping the interface clean.

## Group Permissions

You can control which users can see specific tabs and categories based on their group membership.

- When editing a tab or category, select the groups that should have access.
- Users only see the services they are authorized to use.
- This is ideal for hiding administrative tools from regular users or guest accounts.

## Ordering and Layout

OrganizrX makes it easy to customize the look and feel of your sidebar:

- **Drag and Drop:** In the Tabs and Categories settings, you can simply drag items to change their display order.
- **Custom Icons:** Each tab and category can have a unique icon. You can choose from the built-in library or provide a URL to a custom image.
- **Active State:** The currently selected tab is highlighted in the sidebar for easy navigation.
