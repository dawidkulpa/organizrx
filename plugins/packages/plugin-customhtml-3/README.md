# Custom HTML 3 Plugin for OrganizrX

## Overview

The Custom HTML 3 plugin provides a third user-defined HTML/CSS/JS widget slot for the OrganizrX dashboard. This plugin is functionally identical to Custom HTML 1 and 2, operating as an independent widget with its own configuration namespace. Having multiple Custom HTML slots allows administrators to place various custom content blocks across their dashboard layout without conflicts. Use this slot for embedding external widgets, displaying real-time data from custom APIs via JavaScript fetch calls, showing embedded charts, or creating branded information panels for your media server community.

## Target API

- **No external API required** — This plugin renders user-provided HTML content
- Content is stored in the plugin's configuration settings and rendered directly in the widget
- JavaScript execution is sandboxed within the widget's iframe to prevent interference with the main dashboard
- Custom JS can use `fetch()` to retrieve data from external APIs for dynamic content

## Planned Configuration

| Setting            | Type    | Description                                                     |
| ------------------ | ------- | --------------------------------------------------------------- |
| `custom_html`      | string  | Raw HTML content to render in the widget                        |
| `custom_css`       | string  | CSS styles to apply to the HTML content                         |
| `custom_js`        | string  | JavaScript to execute within the widget sandbox                 |
| `widget_title`     | string  | Custom title for the widget header (default: "Custom HTML 3")   |
| `refresh_interval` | number  | Auto-refresh interval in seconds (0 = no refresh, default: 0)   |
| `sandbox_mode`     | boolean | Whether to render content in an isolated iframe (default: true) |

## Planned Widgets & Features

- **Custom HTML Widget:** Renders the user-provided HTML/CSS/JS content within a dashboard widget. The sandboxed iframe ensures that custom content cannot interfere with OrganizrX's core functionality or other plugins.
- **Preview Mode:** Live preview in the configuration panel for real-time content editing and validation before saving.
- **Template Library:** Starter templates including: countdown timer, embedded Grafana panel, RSS feed reader, and custom status board.

## Example Configuration

```json
{
  "widget_title": "Grafana Embed",
  "custom_html": "<iframe src='http://grafana.local:3000/d/abc123/dashboard?orgId=1&kiosk' width='100%' height='100%' frameborder='0'></iframe>",
  "custom_css": "iframe { border: none; border-radius: 4px; }",
  "custom_js": "",
  "sandbox_mode": false,
  "refresh_interval": 300
}
```

## Adding More Custom HTML Slots

This plugin is slot 3 of 4 available Custom HTML widget slots. If you need more than 4 custom HTML widgets, duplicate any Custom HTML plugin directory and update the package name, plugin ID, manifest name, and widget IDs to create a new uniquely-identified slot.

## Requirements

- No external service requirements — this is a self-contained widget
- HTML/CSS/JS knowledge for creating custom content
- For embedded iframes, the target service must allow framing (no X-Frame-Options deny)
