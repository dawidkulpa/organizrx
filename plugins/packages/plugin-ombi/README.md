# Ombi Plugin for OrganizrX

## Overview

The Ombi plugin integrates OrganizrX with [Ombi](https://ombi.io/), a self-hosted media request management system. Ombi allows users to request movies and TV shows which are then automatically sent to services like Sonarr, Radarr, or CouchPotato for downloading. This plugin provides dashboard widgets that display the current state of media requests, enabling administrators to quickly review, approve, or deny requests without leaving OrganizrX.

## Target API

- **Base URL pattern:** `http://{host}:{port}/api/v1/` (Ombi v3) or `http://{host}:{port}/api/v2/` (Ombi v4)
- **Authentication:** API key passed via `ApiKey` header
- **Key endpoints:**
  - `GET /api/v1/Request/movie` — List movie requests
  - `GET /api/v1/Request/tv` — List TV show requests
  - `POST /api/v1/Request/movie/approve` — Approve a movie request
  - `GET /api/v1/Status` — Service health check

## Planned Configuration

| Setting         | Type    | Description                               |
| --------------- | ------- | ----------------------------------------- |
| `ombi_url`      | string  | Base URL of the Ombi instance             |
| `ombi_api_key`  | string  | API key for authentication                |
| `poll_interval` | number  | Refresh interval in seconds (default: 30) |
| `show_denied`   | boolean | Whether to display denied requests        |

## Planned Widgets & Features

- **Ombi Status Widget:** Shows a summary of pending, approved, and denied requests with counts for movies and TV shows. Displays the most recent requests with requester info and approval status.
- **Request Feed Widget:** A scrollable feed of recent requests with poster thumbnails, request dates, and quick-action approve/deny buttons.

## Example API Response

```json
{
  "id": 123,
  "title": "Interstellar",
  "requestedDate": "2024-01-15T10:30:00Z",
  "approved": false,
  "denied": false,
  "requestedUser": { "userName": "john", "alias": "John" }
}
```

## Requirements

- A running Ombi instance (v3 or v4) accessible from the OrganizrX server
- A valid Ombi API key (generated from Ombi Settings → General → API Key)
- Network connectivity between OrganizrX and the Ombi instance
