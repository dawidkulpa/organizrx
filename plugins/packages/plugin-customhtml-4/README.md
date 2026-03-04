# Custom HTML 4 Plugin for OrganizrX

## Overview

The Custom HTML 4 plugin provides the fourth and final user-defined HTML/CSS/JS widget slot for the OrganizrX dashboard. Like its siblings (Custom HTML 1-3), this plugin operates as an independent widget with its own isolated configuration namespace. This slot is ideal for administrators who want to maximize their dashboard customization with multiple custom content areas. Use it for displaying server documentation links, embedding chat widgets, showing custom notifications, creating interactive tools, or any other HTML-based content that enhances your media server dashboard experience.

## Target API

- **No external API required** — This plugin renders user-provided HTML content
- Content is stored in the plugin's configuration settings and rendered directly in the widget
- JavaScript execution is sandboxed within the widget's iframe to prevent interference with the main dashboard
- The sandbox supports `fetch()` API calls for loading dynamic data from your own endpoints

## Planned Configuration

| Setting            | Type    | Description                                                     |
| ------------------ | ------- | --------------------------------------------------------------- |
| `custom_html`      | string  | Raw HTML content to render in the widget                        |
| `custom_css`       | string  | CSS styles to apply to the HTML content                         |
| `custom_js`        | string  | JavaScript to execute within the widget sandbox                 |
| `widget_title`     | string  | Custom title for the widget header (default: "Custom HTML 4")   |
| `refresh_interval` | number  | Auto-refresh interval in seconds (0 = no refresh, default: 0)   |
| `sandbox_mode`     | boolean | Whether to render content in an isolated iframe (default: true) |

## Planned Widgets & Features

- **Custom HTML Widget:** Renders user-provided HTML/CSS/JS content within a sandboxed dashboard widget. Fully isolated from OrganizrX's DOM to ensure security and stability.
- **Preview Mode:** Real-time preview in the settings panel allowing content validation before deploying to the dashboard.
- **Template Library:** Starter templates including: welcome message card, server links/bookmarks panel, Discord widget embed, and custom data table.

## Example Configuration

```json
{
  "widget_title": "Quick Links",
  "custom_html": "<ul class='links'><li><a href='https://plex.local'>Plex</a></li><li><a href='https://sonarr.local'>Sonarr</a></li><li><a href='https://radarr.local'>Radarr</a></li></ul>",
  "custom_css": ".links { list-style: none; padding: 0; } .links li { padding: 8px 0; border-bottom: 1px solid #333; } .links a { color: #00d4ff; text-decoration: none; }",
  "custom_js": "",
  "sandbox_mode": true,
  "refresh_interval": 0
}
```

## Adding More Custom HTML Slots

This plugin is slot 4 of 4 available Custom HTML widget slots. If you need more than 4 custom HTML widgets on your dashboard, you can create additional slots by duplicating any Custom HTML plugin directory and changing the package name (`@organizrx/plugin-customhtml-N`), the plugin ID (`customhtml-N`), the manifest name, and all widget IDs to ensure uniqueness across the workspace.

## Requirements

- No external service requirements — this is a self-contained widget
- HTML/CSS/JS knowledge for creating custom content
- Content must comply with the browser's Content Security Policy
