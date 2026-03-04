# CouchPotato Plugin for OrganizrX

## Overview

The CouchPotato plugin integrates OrganizrX with [CouchPotato](https://couchpota.to/), an automatic NZB and torrent downloader for movies. CouchPotato automatically searches for movies you want to see and downloads them once they become available in the quality you prefer. This plugin provides dashboard widgets to monitor your wanted movies list, active downloads, and recently snatched or downloaded movies within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/{api_key}/`
- **Authentication:** API key embedded in the URL path
- **Key endpoints:**
  - `GET /api/{key}/movie.list` — List all movies in the wanted list
  - `GET /api/{key}/movie.list/?status=active` — Active movie searches
  - `GET /api/{key}/movie.list/?status=done` — Completed downloads
  - `GET /api/{key}/app.available` — Service health check
  - `GET /api/{key}/renamer.scan` — Trigger renamer scan

## Planned Configuration

| Setting               | Type    | Description                               |
| --------------------- | ------- | ----------------------------------------- |
| `couchpotato_url`     | string  | Base URL of the CouchPotato instance      |
| `couchpotato_api_key` | string  | API key for authentication                |
| `poll_interval`       | number  | Refresh interval in seconds (default: 30) |
| `show_completed`      | boolean | Whether to display completed downloads    |

## Planned Widgets & Features

- **CouchPotato Status Widget:** Displays the number of wanted, snatched, and downloaded movies. Shows overall health of the CouchPotato instance and recent activity.
- **Wanted Movies Widget:** A scrollable list of movies in the wanted list with poster art, release year, quality preferences, and search status.
- **Recent Downloads Widget:** Shows recently completed movie downloads with poster thumbnails and quality information.

## Example API Response

```json
{
  "success": true,
  "movies": [
    {
      "title": "Dune: Part Two",
      "year": 2024,
      "status": "active",
      "profile": { "label": "1080p" },
      "info": { "rating": { "imdb": [8.1] } }
    }
  ]
}
```

## Requirements

- A running CouchPotato instance accessible from the OrganizrX server
- A valid CouchPotato API key (found in CouchPotato Settings → General)
- Network connectivity between OrganizrX and the CouchPotato instance
