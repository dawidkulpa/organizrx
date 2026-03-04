# JDownloader Plugin for OrganizrX

## Overview

The JDownloader plugin integrates OrganizrX with [JDownloader](https://jdownloader.org/), a free, open-source download management tool that supports downloading from a wide variety of file hosting services, video streaming sites, and cloud storage providers. JDownloader can be managed remotely through the My.JDownloader cloud API, allowing dashboard integrations without direct network access. This plugin provides dashboard widgets to monitor active downloads, link grabber status, and overall transfer speeds within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `https://api.jdownloader.org/` (My.JDownloader cloud API)
- **Authentication:** My.JDownloader account credentials (email and password) used to generate encrypted API sessions with server-side key derivation
- **Key endpoints:**
  - `POST /my/connect` — Authenticate and get session token
  - `POST /my/listdevices` — List connected JDownloader instances
  - `POST /t_{sessiontoken}_{deviceid}/downloadsV2/queryLinks` — Query download links
  - `POST /t_{sessiontoken}_{deviceid}/downloadsV2/getStopMark` — Get stop mark position
  - `POST /t_{sessiontoken}_{deviceid}/device/getDirectConnectionInfos` — Get connection info

## Planned Configuration

| Setting                | Type   | Description                                           |
| ---------------------- | ------ | ----------------------------------------------------- |
| `jdownloader_email`    | string | My.JDownloader account email                          |
| `jdownloader_password` | string | My.JDownloader account password                       |
| `jdownloader_device`   | string | Device name to connect to (auto-detected if only one) |
| `poll_interval`        | number | Refresh interval in seconds (default: 10)             |

## Planned Widgets & Features

- **JDownloader Status Widget:** Shows connection status to the JDownloader device, current download speed, number of active downloads, and total remaining download size.
- **Download Queue Widget:** Displays a list of active and queued downloads with file names, progress bars, speeds, and estimated completion times.
- **Link Grabber Widget:** Shows links waiting in the link grabber with package names, host status, and file sizes.

## Example API Response

```json
{
  "data": [
    {
      "name": "file.zip",
      "bytesLoaded": 52428800,
      "bytesTotal": 104857600,
      "speed": 5242880,
      "status": "Running",
      "eta": 10,
      "host": "mega.nz"
    }
  ]
}
```

## Requirements

- A running JDownloader 2 instance with My.JDownloader enabled
- A My.JDownloader account (free at my.jdownloader.org)
- The JDownloader instance must be connected to My.JDownloader
