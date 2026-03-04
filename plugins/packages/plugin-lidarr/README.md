# Lidarr Plugin for OrganizrX

## Overview

The Lidarr plugin integrates OrganizrX with [Lidarr](https://lidarr.audio/), a music collection manager for Usenet and BitTorrent users. Lidarr monitors multiple RSS feeds for new albums from your favorite artists and automatically grabs, sorts, and renames them. This plugin provides dashboard widgets that display your music library status, active downloads, missing albums, and upcoming releases directly within OrganizrX.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/v1/`
- **Authentication:** API key passed via `X-Api-Key` header
- **Key endpoints:**
  - `GET /api/v1/artist` — List all monitored artists
  - `GET /api/v1/album` — List albums
  - `GET /api/v1/queue` — Current download queue
  - `GET /api/v1/wanted/missing` — Missing albums
  - `GET /api/v1/calendar` — Upcoming album releases
  - `GET /api/v1/system/status` — Service health check

## Planned Configuration

| Setting          | Type   | Description                                           |
| ---------------- | ------ | ----------------------------------------------------- |
| `lidarr_url`     | string | Base URL of the Lidarr instance                       |
| `lidarr_api_key` | string | API key for authentication                            |
| `poll_interval`  | number | Refresh interval in seconds (default: 30)             |
| `calendar_days`  | number | Number of days ahead to show in calendar (default: 7) |

## Planned Widgets & Features

- **Lidarr Status Widget:** Shows total artist count, album count, track count, and available disk space. Displays a quick health summary of the Lidarr instance.
- **Download Queue Widget:** Shows active music downloads with progress bars, estimated completion time, and quality profiles.
- **Missing Albums Widget:** Lists albums that are monitored but not yet downloaded, sorted by release date.

## Example API Response

```json
{
  "artistName": "Pink Floyd",
  "albumTitle": "The Dark Side of the Moon",
  "releaseDate": "1973-03-01T00:00:00Z",
  "monitored": true,
  "statistics": { "trackFileCount": 10, "trackCount": 10, "percentOfTracks": 100.0 }
}
```

## Requirements

- A running Lidarr instance accessible from the OrganizrX server
- A valid Lidarr API key (found in Lidarr Settings → General → Security)
- Network connectivity between OrganizrX and the Lidarr instance
