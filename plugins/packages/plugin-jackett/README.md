# Jackett Plugin for OrganizrX

## Overview

The Jackett plugin integrates OrganizrX with [Jackett](https://github.com/Jackett/Jackett), a proxy server that translates queries from applications like Sonarr, Radarr, and Lidarr into tracker-site-specific HTTP queries. Jackett provides a unified API across hundreds of public and private torrent trackers and Usenet indexers. This plugin provides dashboard widgets that display the status of configured indexers, recent search activity, and indexer health information directly within the OrganizrX dashboard, making it easy to monitor your indexer infrastructure.

## Target API

- **Base URL pattern:** `http://{host}:9117/api/v2.0/`
- **Authentication:** API key passed via `apikey` query parameter
- **Key endpoints:**
  - `GET /api/v2.0/indexers/all/results?apikey={key}&Query={query}` — Search across all indexers
  - `GET /api/v2.0/indexers?configured=true` — List configured indexers
  - `GET /api/v2.0/server/config` — Server configuration
  - `GET /api/v2.0/indexers/{id}/results/torznab` — Torznab-compatible search for a specific indexer
  - `GET /api/v2.0/indexers/{id}/status` — Indexer status

## Planned Configuration

| Setting             | Type    | Description                                            |
| ------------------- | ------- | ------------------------------------------------------ |
| `jackett_url`       | string  | Base URL of the Jackett instance                       |
| `jackett_api_key`   | string  | API key for authentication                             |
| `poll_interval`     | number  | Refresh interval in seconds (default: 60)              |
| `show_unconfigured` | boolean | Whether to show unconfigured indexers (default: false) |

## Planned Widgets & Features

- **Jackett Status Widget:** Shows total configured indexers, how many are online/healthy, and the last test time. Provides a quick health overview of your indexer infrastructure.
- **Indexer List Widget:** Displays all configured indexers with name, type (public/private), status (healthy/failing/unknown), and last successful query time.
- **Search Widget:** A simple search interface that queries across all configured Jackett indexers and displays results with title, size, seeders, and indexer source.

## Example API Response

```json
{
  "Results": [
    {
      "Title": "Movie.Name.2024.1080p.BluRay",
      "Size": 4294967296,
      "Seeders": 150,
      "Peers": 30,
      "PublishDate": "2024-01-15T00:00:00Z",
      "Tracker": "PublicTracker",
      "CategoryDesc": "Movies"
    }
  ]
}
```

## Requirements

- A running Jackett instance accessible from the OrganizrX server
- A valid Jackett API key (found on the Jackett dashboard)
- At least one indexer configured in Jackett
