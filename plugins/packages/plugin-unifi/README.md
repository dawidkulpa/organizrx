# UniFi Plugin for OrganizrX

## Overview

The UniFi plugin integrates OrganizrX with [Ubiquiti UniFi Controller](https://www.ui.com/software/), the management software for UniFi networking equipment including access points, switches, gateways, and cameras. The UniFi Controller provides a comprehensive API for monitoring network health, connected clients, device status, and bandwidth usage. This plugin provides dashboard widgets that display your network's health, connected device count, bandwidth utilization, and device status directly within the OrganizrX dashboard, giving you a quick network overview alongside your media server.

## Target API

- **Base URL pattern:** `https://{host}:{port}/api/` (UniFi Controller) or `https://{host}/proxy/network/api/` (UniFi OS)
- **Authentication:** Session-based login via `POST /api/login` with username/password, returns a session cookie. UniFi OS uses `POST /api/auth/login`.
- **Key endpoints:**
  - `POST /api/login` — Authenticate and receive session cookie
  - `GET /api/s/{site}/stat/device` — List all adopted devices
  - `GET /api/s/{site}/stat/sta` — List all connected clients
  - `GET /api/s/{site}/stat/health` — Network health summary
  - `GET /api/s/{site}/stat/sysinfo` — System information
  - `GET /api/s/{site}/rest/user` — User/client database

## Planned Configuration

| Setting          | Type   | Description                               |
| ---------------- | ------ | ----------------------------------------- |
| `unifi_url`      | string | Base URL of the UniFi Controller          |
| `unifi_username` | string | Controller username                       |
| `unifi_password` | string | Controller password                       |
| `unifi_site`     | string | Site name (default: "default")            |
| `poll_interval`  | number | Refresh interval in seconds (default: 30) |

## Planned Widgets & Features

- **UniFi Status Widget:** Shows a compact network overview with total devices adopted, connected clients, network health score, WAN uptime, and any active alerts.
- **Client List Widget:** Displays connected network clients with hostname, IP address, MAC address, connection type (wired/wireless), signal strength, and bandwidth usage.
- **Device Status Widget:** Shows UniFi devices (APs, switches, gateways) with model name, firmware version, uptime, CPU/memory load, and connection status.

## Example API Response

```json
{
  "meta": { "rc": "ok" },
  "data": [
    {
      "name": "Living Room AP",
      "model": "U7PG2",
      "type": "uap",
      "state": 1,
      "adopted": true,
      "uptime": 864000,
      "num_sta": 12,
      "cpu": "15.2",
      "mem": "42.1"
    }
  ]
}
```

## Requirements

- A running UniFi Controller (self-hosted or UniFi OS on UDM/UCK)
- Controller administrator credentials
- Network connectivity between OrganizrX and the UniFi Controller (HTTPS, self-signed certs)
