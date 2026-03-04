# OctoPrint Plugin for OrganizrX

## Overview

The OctoPrint plugin integrates OrganizrX with [OctoPrint](https://octoprint.org/), the open-source 3D printer web interface and control application. OctoPrint allows users to remotely monitor and control their 3D printers via a web-based interface, including starting prints, monitoring progress, and viewing webcam feeds. This plugin provides dashboard widgets that display the current print status, printer temperatures, print progress, and estimated completion time directly within the OrganizrX dashboard, making it easy to keep an eye on your prints alongside your media server.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/`
- **Authentication:** API key passed via `X-Api-Key` header (generated in OctoPrint settings)
- **Key endpoints:**
  - `GET /api/version` — OctoPrint version information
  - `GET /api/connection` — Printer connection status
  - `GET /api/printer` — Current printer state and temperatures
  - `GET /api/job` — Current print job information and progress
  - `GET /api/files` — List uploaded files
  - `GET /api/settings` — OctoPrint settings

## Planned Configuration

| Setting             | Type    | Description                                         |
| ------------------- | ------- | --------------------------------------------------- |
| `octoprint_url`     | string  | Base URL of the OctoPrint instance                  |
| `octoprint_api_key` | string  | API key for authentication                          |
| `poll_interval`     | number  | Refresh interval in seconds (default: 10)           |
| `show_webcam`       | boolean | Whether to display the webcam feed (default: false) |

## Planned Widgets & Features

- **OctoPrint Status Widget:** Displays printer connection state, current print job name, progress percentage with a visual progress bar, estimated time remaining, and hotend/bed temperatures.
- **Temperature Widget:** Shows real-time temperature readings for the hotend and heated bed with target temperatures and a mini temperature history chart.
- **Print History Widget:** Lists recent completed prints with file name, print duration, and filament usage.

## Example API Response

```json
{
  "job": {
    "file": { "name": "benchy.gcode", "size": 1234567 },
    "estimatedPrintTime": 7200,
    "filament": { "tool0": { "length": 5432.1, "volume": 13.1 } }
  },
  "progress": {
    "completion": 67.5,
    "printTime": 4860,
    "printTimeLeft": 2340
  },
  "state": "Printing"
}
```

## Requirements

- A running OctoPrint instance accessible from the OrganizrX server
- An OctoPrint API key (generated in OctoPrint Settings → API)
- A 3D printer connected to the OctoPrint instance
