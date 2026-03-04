# uTorrent Plugin for OrganizrX

## Overview

The uTorrent plugin integrates OrganizrX with [uTorrent](https://www.utorrent.com/), one of the most widely used BitTorrent clients available for Windows, macOS, and Linux. uTorrent provides a web-based API that allows remote management of torrents, making it suitable for integration into media server dashboards. This plugin provides dashboard widgets that display active torrent transfers, download and upload speeds, and overall client status directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/gui/`
- **Authentication:** HTTP Basic authentication with username and password, plus a CSRF token obtained from `GET /gui/token.html`
- **Key endpoints:**
  - `GET /gui/?list=1&token={token}` — List all torrents
  - `GET /gui/?action=start&hash={hash}&token={token}` — Start a torrent
  - `GET /gui/?action=stop&hash={hash}&token={token}` — Stop a torrent
  - `GET /gui/?action=getsettings&token={token}` — Get client settings

## Planned Configuration

| Setting             | Type   | Description                              |
| ------------------- | ------ | ---------------------------------------- |
| `utorrent_url`      | string | Base URL of the uTorrent WebUI           |
| `utorrent_username` | string | Username for WebUI authentication        |
| `utorrent_password` | string | Password for WebUI authentication        |
| `poll_interval`     | number | Refresh interval in seconds (default: 5) |

## Planned Widgets & Features

- **uTorrent Status Widget:** Shows global download and upload speed, number of active torrents, and overall transfer statistics in a compact summary view.
- **Torrent List Widget:** Displays all torrents with name, size, progress percentage, download/upload speed, ratio, availability, and current status.
- **Transfer Summary Widget:** Shows session totals including data downloaded, uploaded, and current connection count.

## Example API Response

```json
{
  "torrents": [
    [
      "HASH123",
      200,
      "Movie.Name.1080p.mkv",
      1073741824,
      536870912,
      536870912,
      500,
      1000,
      50,
      2,
      5242880,
      1048576,
      3600,
      -1,
      0,
      0,
      65536,
      -1,
      0,
      "",
      "",
      ""
    ]
  ]
}
```

The torrent array fields correspond to: hash, status, name, size, progress (per mil), downloaded, uploaded, ratio, upload speed, download speed, eta, label, peers connected, peers in swarm, seeds connected, seeds in swarm, availability, queue order, remaining.

## Requirements

- A running uTorrent instance with the WebUI feature enabled
- WebUI credentials configured in uTorrent preferences
- Network connectivity between OrganizrX and the uTorrent WebUI
