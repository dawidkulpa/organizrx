# Custom HTML 1 Plugin for OrganizrX

## Overview

The Custom HTML 1 plugin provides a user-defined HTML/CSS/JS widget slot for the OrganizrX dashboard. This plugin allows administrators to inject custom HTML content, CSS styles, and JavaScript directly into a dashboard widget, enabling unlimited customization possibilities. Common use cases include embedding external dashboards, displaying custom status pages, adding informational banners, showing server rules or announcements, and integrating with services that don't have dedicated plugins. This is slot 1 of 4 available Custom HTML slots — additional slots can be created by duplicating this plugin with incremented IDs.

## Target API

- **No external API required** — This plugin renders user-provided HTML content
- Content is stored in the plugin's configuration settings and rendered directly in the widget
- JavaScript execution is sandboxed within the widget's iframe to prevent interference with the main dashboard

## Planned Configuration

| Setting            | Type    | Description                                                     |
| ------------------ | ------- | --------------------------------------------------------------- |
| `custom_html`      | string  | Raw HTML content to render in the widget                        |
| `custom_css`       | string  | CSS styles to apply to the HTML content                         |
| `custom_js`        | string  | JavaScript to execute within the widget sandbox                 |
| `widget_title`     | string  | Custom title for the widget header (default: "Custom HTML 1")   |
| `refresh_interval` | number  | Auto-refresh interval in seconds (0 = no refresh, default: 0)   |
| `sandbox_mode`     | boolean | Whether to render content in an isolated iframe (default: true) |

## Planned Widgets & Features

- **Custom HTML Widget:** Renders the user-provided HTML/CSS/JS content within a dashboard widget. Content is displayed in a sandboxed iframe by default to prevent XSS and DOM interference with the main OrganizrX application. The widget supports auto-refresh for dynamic content.
- **Preview Mode:** A live preview in the configuration panel so administrators can see their content before saving.
- **Template Library:** A set of pre-built templates (clock, server rules, announcement banner, embed frame) that users can start from and customize.

## Example Configuration

```json
{
  "widget_title": "Server Announcement",
  "custom_html": "<div class='announcement'><h2>Server Maintenance</h2><p>Scheduled downtime: Saturday 2AM-4AM EST</p></div>",
  "custom_css": ".announcement { padding: 16px; background: #1a1a2e; border-radius: 8px; color: #e0e0e0; } .announcement h2 { color: #00d4ff; margin-bottom: 8px; }",
  "custom_js": "",
  "sandbox_mode": true,
  "refresh_interval": 0
}
```

## Adding More Custom HTML Slots

This plugin is slot 1 of 4 available Custom HTML widget slots. If you need more than 4 custom HTML widgets on your dashboard, you can create additional slots by duplicating this plugin directory and updating the following values:

- `package.json`: Change the name to `@organizrx/plugin-customhtml-N`
- `src/index.ts`: Update `id` to `customhtml-N`, `name` to `Custom HTML N`, and widget IDs accordingly

## Requirements

- No external service requirements — this is a self-contained widget
- HTML/CSS/JS knowledge for creating custom content
- Content must comply with the browser's Content Security Policy
