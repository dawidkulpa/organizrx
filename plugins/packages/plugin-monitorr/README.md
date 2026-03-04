# Monitorr Plugin for OrganizrX

## Overview

The Monitorr plugin integrates OrganizrX with [Monitorr](https://github.com/Monitorr/Monitorr), a self-hosted PHP-based webfront to live-display the status of any webapp or service. Monitorr provides a lightweight dashboard for monitoring whether your various services (Plex, Sonarr, Radarr, etc.) are online and responsive. This plugin brings Monitorr's service status information into the OrganizrX dashboard, allowing users to see the health of their entire home server stack at a glance without switching between applications.

## Target API

- **Base URL pattern:** `http://{host}:{port}/assets/php/`
- **Authentication:** No built-in API authentication; relies on network-level access control
- **Key endpoints:**
  - `GET /assets/php/motd.php` — Service status data as JSON
  - `GET /assets/php/check_ping.php?url={service_url}` — Ping a specific service
  - `GET /settings.json` — Monitorr configuration with service definitions

## Planned Configuration

| Setting              | Type    | Description                                       |
| -------------------- | ------- | ------------------------------------------------- |
| `monitorr_url`       | string  | Base URL of the Monitorr instance                 |
| `poll_interval`      | number  | Refresh interval in seconds (default: 30)         |
| `show_response_time` | boolean | Whether to display response time for each service |
| `alert_on_down`      | boolean | Whether to highlight services that are down       |

## Planned Widgets & Features

- **Monitorr Status Widget:** Displays a grid of service icons with green/red status indicators showing which services are online or offline. Includes the service name and optional response time.
- **Service Detail Widget:** A more detailed view showing service name, URL, current status, last check time, and response time history.
- **Uptime Summary Widget:** Shows overall uptime percentage across all monitored services with a summary count of online vs. offline services.

## Example API Response

```json
[
  {
    "name": "Plex",
    "url": "http://192.168.1.10:32400",
    "status": "online",
    "response_time": 45,
    "last_check": "2024-01-15T10:30:00Z"
  },
  {
    "name": "Sonarr",
    "url": "http://192.168.1.10:8989",
    "status": "offline",
    "response_time": null,
    "last_check": "2024-01-15T10:30:00Z"
  }
]
```

## Requirements

- A running Monitorr instance accessible from the OrganizrX server
- Services configured within Monitorr's settings
- Network connectivity between OrganizrX and the Monitorr instance
