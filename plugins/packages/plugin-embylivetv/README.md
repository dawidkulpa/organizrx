# Emby Live TV Plugin for OrganizrX

## Overview

The Emby Live TV plugin integrates OrganizrX with [Emby's Live TV](https://emby.media/live-tv.html) feature, providing a dashboard widget that displays the electronic program guide (EPG), currently airing programs, upcoming shows, and DVR recording schedules. Emby supports Live TV through various tuner sources including HDHomeRun, IPTV, and other compatible devices. This plugin brings the Live TV guide directly into the OrganizrX dashboard, allowing users to see what's currently on, what's coming up, and manage their recording schedule without opening the full Emby interface.

## Target API

- **Base URL pattern:** `http://{host}:{port}/emby/`
- **Authentication:** API key passed via `api_key` query parameter or `X-Emby-Token` header
- **Key endpoints:**
  - `GET /emby/LiveTv/Channels?api_key={key}` — List all Live TV channels
  - `GET /emby/LiveTv/Programs?api_key={key}` — Current and upcoming programs
  - `GET /emby/LiveTv/Programs/Recommended?api_key={key}` — Recommended programs
  - `GET /emby/LiveTv/Timers?api_key={key}` — Scheduled recordings (timers)
  - `GET /emby/LiveTv/Recordings?api_key={key}` — Completed recordings
  - `GET /emby/LiveTv/Info?api_key={key}` — Live TV service info and tuner status

## Planned Configuration

| Setting         | Type   | Description                                         |
| --------------- | ------ | --------------------------------------------------- |
| `emby_url`      | string | Base URL of the Emby server                         |
| `emby_api_key`  | string | Emby API key for authentication                     |
| `poll_interval` | number | Refresh interval in seconds (default: 60)           |
| `channel_limit` | number | Maximum number of channels to display (default: 20) |
| `guide_hours`   | number | Number of hours of guide data to show (default: 4)  |

## Planned Widgets & Features

- **Emby Live TV Status Widget:** Shows a compact overview of Live TV including number of available channels, currently recording programs, upcoming recordings, and tuner availability (in use vs. available).
- **Program Guide Widget:** A condensed EPG grid showing channels in rows with program blocks sized by duration. Currently airing programs are highlighted with elapsed time indicators.
- **Recordings Widget:** Lists upcoming scheduled recordings and recently completed recordings with program name, channel, time, and status.
- **Now Playing Widget:** Shows what's currently airing on each channel with program title, description, start/end time, and genre.

## Example API Response

```json
{
  "Items": [
    {
      "Name": "Breaking News",
      "ChannelName": "CNN HD",
      "ChannelNumber": "203",
      "StartDate": "2024-01-15T18:00:00Z",
      "EndDate": "2024-01-15T19:00:00Z",
      "Overview": "Latest breaking news coverage",
      "IsMovie": false,
      "IsSeries": false,
      "Status": "InProgress",
      "HasTimer": false
    }
  ],
  "TotalRecordCount": 150
}
```

## Requirements

- An Emby server with Emby Premiere (required for Live TV/DVR features)
- A compatible TV tuner configured in Emby (HDHomeRun, IPTV M3U, etc.)
- A valid Emby API key (generated from Emby Dashboard → API Keys)
- Network connectivity between OrganizrX and the Emby server
