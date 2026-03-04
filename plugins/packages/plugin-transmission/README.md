# Transmission Plugin for OrganizrX

## Overview

The Transmission plugin integrates OrganizrX with [Transmission](https://transmissionbt.com/), a lightweight and open-source BitTorrent client. Transmission is widely used in home media server setups as the download backend for Sonarr, Radarr, and Lidarr. This plugin provides dashboard widgets that display active torrent transfers, download and upload speeds, completed torrents, and overall session statistics directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/transmission/rpc`
- **Authentication:** HTTP Basic authentication with username and password, plus a session ID token (`X-Transmission-Session-Id` header) obtained via an initial 409 response
- **Protocol:** Transmission RPC (JSON over HTTP POST)
- **Key RPC methods:**
  - `torrent-get` — Get torrent list with fields (name, status, percentDone, rateDownload, rateUpload)
  - `torrent-start` / `torrent-stop` — Start or stop torrents
  - `session-stats` — Session download/upload totals
  - `session-get` — Session settings and version info

## Planned Configuration

| Setting                 | Type   | Description                               |
| ----------------------- | ------ | ----------------------------------------- |
| `transmission_url`      | string | Base URL of the Transmission RPC endpoint |
| `transmission_username` | string | Username for HTTP Basic auth              |
| `transmission_password` | string | Password for HTTP Basic auth              |
| `poll_interval`         | number | Refresh interval in seconds (default: 5)  |

## Planned Widgets & Features

- **Transmission Status Widget:** Shows overall download and upload speed, number of active torrents, and total session transfer amounts in a compact format.
- **Torrent List Widget:** Displays a scrollable list of active torrents with progress bars, speeds, ETA, and status (downloading, seeding, paused).
- **Speed Graph Widget:** A real-time line chart showing download and upload speeds over time.

## Example API Response

```json
{
  "arguments": {
    "torrents": [
      {
        "name": "ubuntu-24.04-desktop-amd64.iso",
        "percentDone": 0.75,
        "rateDownload": 5242880,
        "rateUpload": 1048576,
        "status": 4
      }
    ]
  },
  "result": "success"
}
```

## Requirements

- A running Transmission instance with the web interface/RPC enabled
- RPC authentication credentials (if configured)
- Network connectivity between OrganizrX and the Transmission instance
