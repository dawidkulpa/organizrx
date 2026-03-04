# Netdata Plugin for OrganizrX

## Overview

The Netdata plugin integrates OrganizrX with [Netdata](https://www.netdata.cloud/), a distributed, real-time, performance and health monitoring solution for systems, hardware, containers, and applications. Netdata collects thousands of metrics per second with zero configuration and provides beautiful, interactive dashboards. This plugin provides dashboard widgets that display key system metrics such as CPU usage, memory consumption, disk I/O, network throughput, and system load directly within the OrganizrX dashboard, giving administrators a quick health overview of their server infrastructure.

## Target API

- **Base URL pattern:** `http://{host}:19999/api/v1/`
- **Authentication:** No authentication by default; can be configured with HTTP Basic auth via a reverse proxy
- **Key endpoints:**
  - `GET /api/v1/info` — System information and Netdata version
  - `GET /api/v1/data?chart=system.cpu` — CPU usage data
  - `GET /api/v1/data?chart=system.ram` — Memory usage data
  - `GET /api/v1/data?chart=system.net` — Network throughput data
  - `GET /api/v1/data?chart=disk_space._` — Disk space usage
  - `GET /api/v1/charts` — List all available charts
  - `GET /api/v1/alarms` — Active alarms and warnings

## Planned Configuration

| Setting            | Type     | Description                                            |
| ------------------ | -------- | ------------------------------------------------------ |
| `netdata_url`      | string   | Base URL of the Netdata instance (default port: 19999) |
| `netdata_username` | string   | Username for HTTP Basic auth (optional)                |
| `netdata_password` | string   | Password for HTTP Basic auth (optional)                |
| `poll_interval`    | number   | Refresh interval in seconds (default: 5)               |
| `charts`           | string[] | List of chart IDs to display (default: cpu, ram, net)  |

## Planned Widgets & Features

- **Netdata Status Widget:** Shows a compact overview of CPU usage, memory usage, disk space, and network I/O with sparkline-style mini charts for each metric.
- **CPU & Memory Widget:** Detailed CPU and memory usage with real-time updating gauges and historical trend lines.
- **Alarms Widget:** Displays active Netdata alarms and warnings with severity levels, affected charts, and alert descriptions.

## Example API Response

```json
{
  "labels": ["time", "user", "system", "iowait", "idle"],
  "data": [
    [1705312200, 15.2, 3.1, 0.5, 81.2],
    [1705312201, 14.8, 2.9, 0.3, 82.0]
  ]
}
```

## Requirements

- A running Netdata agent on the server(s) you want to monitor
- The Netdata web server accessible from the OrganizrX server (default port 19999)
- Network connectivity between OrganizrX and the Netdata instance
