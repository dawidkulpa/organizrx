# Deluge Plugin for OrganizrX

## Overview

The Deluge plugin integrates OrganizrX with [Deluge](https://deluge-torrent.org/), a lightweight, free, and cross-platform BitTorrent client. Deluge is a popular choice in the home server community due to its rich plugin ecosystem and extensive configuration options. This plugin provides dashboard widgets that display active torrent transfers, download and upload speeds, disk usage, and per-torrent progress directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/json`
- **Authentication:** JSON-RPC method `auth.login` with password, which returns a session cookie used for subsequent requests
- **Protocol:** Deluge WebUI JSON-RPC 2.0 over HTTP POST
- **Key RPC methods:**
  - `auth.login` — Authenticate and receive session cookie
  - `core.get_torrents_status` — Get status of all torrents with specified fields
  - `core.get_session_status` — Overall session stats (speeds, connections)
  - `core.pause_torrent` / `core.resume_torrent` — Control individual torrents
  - `web.get_host_status` — Connection status to the Deluge daemon

## Planned Configuration

| Setting           | Type    | Description                                                |
| ----------------- | ------- | ---------------------------------------------------------- |
| `deluge_url`      | string  | Base URL of the Deluge WebUI                               |
| `deluge_password` | string  | WebUI password for authentication                          |
| `poll_interval`   | number  | Refresh interval in seconds (default: 5)                   |
| `show_completed`  | boolean | Whether to show completed/seeding torrents (default: true) |

## Planned Widgets & Features

- **Deluge Status Widget:** Shows total download and upload speed, active torrent count, disk space usage, and daemon connection status in a compact summary.
- **Torrent List Widget:** A scrollable list of torrents showing name, progress percentage, download/upload speed, ETA, ratio, and current state.
- **Transfer Overview Widget:** Displays session totals including total downloaded, uploaded, share ratio, and connection counts.

## Example API Response

```json
{
  "id": 1,
  "result": {
    "torrent_hash_abc123": {
      "name": "Big.Buck.Bunny.1080p",
      "progress": 65.4,
      "download_payload_rate": 3145728,
      "upload_payload_rate": 524288,
      "state": "Downloading",
      "eta": 3600
    }
  },
  "error": null
}
```

## Requirements

- A running Deluge instance with the WebUI plugin enabled
- The WebUI password (configured in Deluge preferences)
- Network connectivity between OrganizrX and the Deluge WebUI
