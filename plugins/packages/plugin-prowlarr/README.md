# Prowlarr Plugin for OrganizrX

## Overview

The Prowlarr plugin integrates OrganizrX with [Prowlarr](https://prowlarr.com/), an indexer manager and proxy built on the popular *arr stack. Prowlarr is the successor/alternative to Jackett, providing native integration with Sonarr, Radarr, Lidarr, and Readarr. It supports management of both torrent trackers and Usenet indexers with automatic sync to your *arr applications. This plugin provides dashboard widgets that display the status of configured indexers, sync status with connected applications, and search statistics directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/v1/`
- **Authentication:** API key passed via `X-Api-Key` header
- **Key endpoints:**
  - `GET /api/v1/indexer` — List all configured indexers
  - `GET /api/v1/indexerstats` — Indexer statistics (queries, grabs, failures)
  - `GET /api/v1/search?query={query}` — Search across all indexers
  - `GET /api/v1/health` — Health check issues
  - `GET /api/v1/system/status` — System status and version
  - `GET /api/v1/applications` — Connected applications (Sonarr, Radarr, etc.)

## Planned Configuration

| Setting            | Type    | Description                                               |
| ------------------ | ------- | --------------------------------------------------------- |
| `prowlarr_url`     | string  | Base URL of the Prowlarr instance                         |
| `prowlarr_api_key` | string  | API key for authentication                                |
| `poll_interval`    | number  | Refresh interval in seconds (default: 60)                 |
| `show_stats`       | boolean | Whether to display search/grab statistics (default: true) |

## Planned Widgets & Features

- **Prowlarr Status Widget:** Shows total indexers, healthy vs. failing indexers, connected applications count, and overall search statistics in a compact summary.
- **Indexer Health Widget:** Displays each configured indexer with name, protocol (torrent/usenet), status, average response time, and failure rate.
- **Statistics Widget:** Shows search queries, successful grabs, and failure rates over time with per-indexer breakdowns.

## Example API Response

```json
{
  "indexers": [
    {
      "id": 1,
      "name": "1337x",
      "protocol": "torrent",
      "enable": true,
      "averageResponseTime": 450,
      "numberOfQueries": 1234,
      "numberOfGrabs": 56
    }
  ]
}
```

## Requirements

- A running Prowlarr instance accessible from the OrganizrX server
- A valid Prowlarr API key (found in Prowlarr Settings → General)
- Network connectivity between OrganizrX and the Prowlarr instance
