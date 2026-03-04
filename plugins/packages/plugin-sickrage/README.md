# SickRage Plugin for OrganizrX

## Overview

The SickRage plugin integrates OrganizrX with [SickRage](https://www.sickrage.ca/) (and its fork SickChill), an automatic video library manager for TV shows. SickRage monitors RSS feeds for new episodes of your favorite TV shows and automatically downloads, sorts, and renames them. This plugin provides dashboard widgets that display upcoming episodes, show statistics, download history, and backlog information directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/{api_key}/`
- **Authentication:** API key embedded in the URL path as a path segment
- **Key endpoints:**
  - `GET /api/{key}/?cmd=shows` — List all tracked shows
  - `GET /api/{key}/?cmd=future` — Upcoming episodes
  - `GET /api/{key}/?cmd=history` — Download history
  - `GET /api/{key}/?cmd=shows.stats` — Show statistics
  - `GET /api/{key}/?cmd=sb.ping` — Service health check
  - `GET /api/{key}/?cmd=backlog` — Backlog queue

## Planned Configuration

| Setting            | Type   | Description                                                     |
| ------------------ | ------ | --------------------------------------------------------------- |
| `sickrage_url`     | string | Base URL of the SickRage/SickChill instance                     |
| `sickrage_api_key` | string | API key for authentication                                      |
| `poll_interval`    | number | Refresh interval in seconds (default: 30)                       |
| `future_days`      | number | Number of days to look ahead for upcoming episodes (default: 7) |

## Planned Widgets & Features

- **SickRage Status Widget:** Shows a summary of total shows, episodes downloaded vs. total, and overall completion percentage. Displays the service health status.
- **Upcoming Episodes Widget:** Lists upcoming episodes with air dates, show names, episode titles, and network information.
- **Download History Widget:** Shows recent downloads with episode details, quality, and download status (snatched, downloaded, failed).

## Example API Response

```json
{
  "result": "success",
  "data": {
    "shows_active": 42,
    "ep_downloaded": 3200,
    "ep_total": 3500,
    "ep_snatched": 5
  }
}
```

## Requirements

- A running SickRage or SickChill instance accessible from the OrganizrX server
- A valid API key (found in SickRage Settings → General → API Key)
- Network connectivity between OrganizrX and the SickRage instance
