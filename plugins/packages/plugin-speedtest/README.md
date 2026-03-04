# Speedtest Plugin for OrganizrX

## Overview

The Speedtest plugin integrates OrganizrX with [Speedtest Tracker](https://github.com/alexjustesen/speedtest-tracker), a self-hosted internet performance tracking application that runs speedtests using Ookla's Speedtest CLI on a scheduled basis. It stores historical results and provides a web interface for viewing trends. This plugin provides dashboard widgets that display the latest speed test results, historical speed trends, and alerts when internet performance drops below configured thresholds, all directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/v1/`
- **Authentication:** API token passed via `Authorization: Bearer {token}` header
- **Key endpoints:**
  - `GET /api/v1/results/latest` — Latest speed test result
  - `GET /api/v1/results` — Paginated list of all results
  - `GET /api/v1/results?filter[created_at]=>={date}` — Results filtered by date
  - `POST /api/v1/jobs/speedtest` — Trigger a new speed test

## Planned Configuration

| Setting               | Type   | Description                                 |
| --------------------- | ------ | ------------------------------------------- |
| `speedtest_url`       | string | Base URL of the Speedtest Tracker instance  |
| `speedtest_api_token` | string | API token for authentication                |
| `poll_interval`       | number | Refresh interval in seconds (default: 300)  |
| `min_download_mbps`   | number | Minimum download speed threshold for alerts |
| `min_upload_mbps`     | number | Minimum upload speed threshold for alerts   |

## Planned Widgets & Features

- **Speedtest Status Widget:** Displays the latest speed test result with download speed, upload speed, ping, and jitter values in a compact format with color coding based on performance thresholds.
- **Speed History Chart Widget:** A line chart showing download and upload speed trends over the past 24 hours, week, or month.
- **ISP Performance Widget:** Shows ISP name, server location, and average speeds over time with comparison to advertised speeds.

## Example API Response

```json
{
  "data": {
    "id": 1234,
    "download": 450.25,
    "upload": 42.1,
    "ping": 12.5,
    "jitter": 2.1,
    "server_name": "Local ISP - City",
    "isp": "Comcast",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

## Requirements

- A running Speedtest Tracker instance accessible from the OrganizrX server
- An API token generated from the Speedtest Tracker settings
- The Ookla Speedtest CLI installed on the Speedtest Tracker server
