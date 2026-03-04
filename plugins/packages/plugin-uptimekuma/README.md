# Uptime Kuma Plugin for OrganizrX

## Overview

The Uptime Kuma plugin integrates OrganizrX with [Uptime Kuma](https://github.com/louislam/uptime-kuma), a fancy self-hosted monitoring tool. Uptime Kuma supports monitoring via HTTP(S), TCP, DNS, Docker, Steam Game Server, and more, with a beautiful reactive UI and notification support. This plugin brings Uptime Kuma's comprehensive monitoring data into the OrganizrX dashboard, displaying real-time status of all monitored services, uptime percentages, response times, and incident history without requiring users to switch between applications.

## Target API

- **Base URL pattern:** `http://{host}:{port}/`
- **Authentication:** API key via `/api/status-page/{slug}` (public), or session-based login for full access
- **Key endpoints:**
  - `GET /api/status-page/{slug}` — Public status page data
  - `GET /api/entry-page` — Entry page configuration
  - WebSocket `/socket.io/` — Real-time monitor updates (primary API method)
  - `GET /metrics` — Prometheus-compatible metrics endpoint

## Planned Configuration

| Setting                  | Type   | Description                                      |
| ------------------------ | ------ | ------------------------------------------------ |
| `uptimekuma_url`         | string | Base URL of the Uptime Kuma instance             |
| `uptimekuma_api_key`     | string | API key for status page access                   |
| `uptimekuma_status_page` | string | Status page slug to display (default: "default") |
| `poll_interval`          | number | Refresh interval in seconds (default: 30)        |

## Planned Widgets & Features

- **Uptime Kuma Status Widget:** Displays a compact grid of monitored services with color-coded status indicators (green = up, red = down, yellow = pending), response times, and uptime percentages.
- **Incident Timeline Widget:** Shows a timeline of recent incidents with start time, duration, and affected monitors.
- **Response Time Chart Widget:** A line chart showing response time trends over 24 hours for selected monitors.

## Example API Response

```json
{
  "publicGroupList": [
    {
      "name": "Media Services",
      "monitorList": [
        {
          "id": 1,
          "name": "Plex",
          "type": "http",
          "url": "http://192.168.1.10:32400",
          "active": true,
          "interval": 60
        }
      ]
    }
  ],
  "heartbeatList": {
    "1": [{ "status": 1, "time": "2024-01-15 10:30:00", "ping": 45 }]
  }
}
```

## Requirements

- A running Uptime Kuma instance (v1.x or v2.x) accessible from the OrganizrX server
- A public status page configured in Uptime Kuma (for API key access)
- Network connectivity between OrganizrX and the Uptime Kuma instance
