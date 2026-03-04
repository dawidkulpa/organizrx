# JellyStat Plugin for OrganizrX

## Overview

The JellyStat plugin integrates OrganizrX with [JellyStat](https://github.com/CyferShepard/Jellystat), a free and open-source statistics and monitoring tool for Jellyfin media servers. JellyStat tracks viewing activity, user statistics, and media library analytics similar to what Tautulli provides for Plex. This plugin provides dashboard widgets that display viewing history, most-watched content, user activity summaries, and library growth statistics directly within the OrganizrX dashboard, giving Jellyfin administrators insight into how their media library is being used.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/`
- **Authentication:** API key passed via `x-api-token` header
- **Key endpoints:**
  - `GET /api/getLibraries` — List all Jellyfin libraries with statistics
  - `GET /api/getHistory` — Playback history with filtering options
  - `GET /api/getViewsOverTime` — Views aggregated over time periods
  - `GET /api/getMostWatchedItems` — Most-watched movies and shows
  - `GET /api/getMostActiveUsers` — Most active user statistics
  - `GET /api/getGlobalStats` — Overall server statistics summary

## Planned Configuration

| Setting             | Type   | Description                                        |
| ------------------- | ------ | -------------------------------------------------- |
| `jellystat_url`     | string | Base URL of the JellyStat instance                 |
| `jellystat_api_key` | string | API key for authentication                         |
| `poll_interval`     | number | Refresh interval in seconds (default: 60)          |
| `history_days`      | number | Number of days of history to display (default: 30) |
| `top_items_count`   | number | Number of top items to show (default: 10)          |

## Planned Widgets & Features

- **JellyStat Status Widget:** Displays a summary of total plays, total watch time, unique viewers, and active streams. Shows the most recently watched item with poster art and user information.
- **Most Watched Widget:** Lists the most-watched movies and TV shows over a configurable time period with play counts, total watch time, and poster thumbnails.
- **User Activity Widget:** Shows per-user watching statistics including total plays, watch time, last activity, and most-watched content for each user.
- **Watch History Widget:** A scrollable timeline of recent playback activity across all users.

## Example API Response

```json
{
  "data": [
    {
      "NowPlayingItemName": "Breaking Bad",
      "EpisodeName": "Ozymandias",
      "UserName": "john",
      "PlayDuration": 2820,
      "ActivityDateInserted": "2024-01-15T20:30:00Z",
      "PlayMethod": "DirectPlay"
    }
  ],
  "total_duration": 14400,
  "total_plays": 25
}
```

## Requirements

- A running JellyStat instance connected to your Jellyfin server
- A valid JellyStat API key (generated from JellyStat settings)
- A Jellyfin server with JellyStat data collection enabled
