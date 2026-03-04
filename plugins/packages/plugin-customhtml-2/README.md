# Custom HTML 2 Plugin for OrganizrX

## Overview

The Custom HTML 2 plugin provides a second user-defined HTML/CSS/JS widget slot for the OrganizrX dashboard. This plugin is identical in functionality to Custom HTML 1 but operates as an independent widget with its own configuration, allowing administrators to place multiple custom content widgets on their dashboard simultaneously. Common use cases include embedding external monitoring dashboards, displaying server statistics from custom scripts, showing community announcements, or integrating with niche services that lack dedicated plugins. This is slot 2 of 4 available Custom HTML slots — additional slots can be created by duplicating this plugin.

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
| `widget_title`     | string  | Custom title for the widget header (default: "Custom HTML 2")   |
| `refresh_interval` | number  | Auto-refresh interval in seconds (0 = no refresh, default: 0)   |
| `sandbox_mode`     | boolean | Whether to render content in an isolated iframe (default: true) |

## Planned Widgets & Features

- **Custom HTML Widget:** Renders the user-provided HTML/CSS/JS content within a dashboard widget. Content is displayed in a sandboxed iframe by default to prevent XSS and DOM interference with the main OrganizrX application.
- **Preview Mode:** A live preview in the configuration panel so administrators can see their content before saving.
- **Template Library:** Pre-built templates (clock display, system stats, embed frame, news ticker) that users can customize.

## Example Configuration

```json
{
  "widget_title": "Server Stats",
  "custom_html": "<div id='stats'><p>CPU: <span id='cpu'>--</span>%</p><p>RAM: <span id='ram'>--</span>%</p></div>",
  "custom_css": "#stats { font-family: monospace; padding: 12px; color: #00ff88; background: #0a0a0a; }",
  "custom_js": "setInterval(() => { document.getElementById('cpu').textContent = Math.floor(Math.random() * 100); }, 2000);",
  "sandbox_mode": true,
  "refresh_interval": 0
}
```

## Adding More Custom HTML Slots

This plugin is slot 2 of 4 available Custom HTML widget slots. If you need more than 4 custom HTML widgets, duplicate any Custom HTML plugin directory and update the ID, name, and widget IDs to create a new slot.

## Requirements

- No external service requirements — this is a self-contained widget
- HTML/CSS/JS knowledge for creating custom content
- Content must comply with the browser's Content Security Policy
