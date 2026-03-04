# rTorrent Plugin for OrganizrX

## Overview

The rTorrent plugin integrates OrganizrX with [rTorrent](https://rakshasa.github.io/rtorrent/), a stable, high-performance, and low-resource BitTorrent client designed for use on Unix-like systems. rTorrent is commonly used alongside web frontends like ruTorrent and Flood, making it a popular choice for seedbox and home server deployments. This plugin provides dashboard widgets that display active torrent information, transfer speeds, and download progress directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/RPC2` or `http://{host}:{port}/plugins/httprpc/action.php` (via ruTorrent)
- **Authentication:** HTTP Basic authentication (if configured via web server)
- **Protocol:** XML-RPC over HTTP POST
- **Key XML-RPC methods:**
  - `d.multicall2` — Get list of all torrents with selected fields
  - `throttle.global_down.rate` — Current global download rate
  - `throttle.global_up.rate` — Current global upload rate
  - `system.hostname` — System identification
  - `d.start` / `d.stop` — Start or stop individual torrents

## Planned Configuration

| Setting             | Type   | Description                              |
| ------------------- | ------ | ---------------------------------------- |
| `rtorrent_url`      | string | URL of the rTorrent XML-RPC endpoint     |
| `rtorrent_username` | string | Username for HTTP Basic auth (optional)  |
| `rtorrent_password` | string | Password for HTTP Basic auth (optional)  |
| `poll_interval`     | number | Refresh interval in seconds (default: 5) |

## Planned Widgets & Features

- **rTorrent Status Widget:** Shows global download and upload speed, active torrent count, and total data transferred in a compact summary view.
- **Torrent List Widget:** Displays a scrollable list of torrents with name, progress bar, download/upload speed, ratio, and current state (downloading, seeding, stopped).
- **Disk Usage Widget:** Shows available disk space on the download directory and alerts when space is running low.

## Example API Response

```xml
<?xml version="1.0"?>
<methodResponse>
  <params>
    <param>
      <value>
        <array>
          <data>
            <value><string>Ubuntu.24.04.iso</string></value>
            <value><i8>734003200</i8></value>
            <value><i8>550502400</i8></value>
          </data>
        </array>
      </value>
    </param>
  </params>
</methodResponse>
```

## Requirements

- A running rTorrent instance with XML-RPC enabled (via SCGI or HTTP)
- A web server (nginx, Apache) proxying XML-RPC requests (or ruTorrent installed)
- Network connectivity between OrganizrX and the rTorrent XML-RPC endpoint
