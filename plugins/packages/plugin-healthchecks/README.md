# HealthChecks Plugin for OrganizrX

## Overview

The HealthChecks plugin integrates OrganizrX with [HealthChecks.io](https://healthchecks.io/), a cron job monitoring service that listens for pings from your cron jobs, scripts, and scheduled tasks. If a ping does not arrive on time, HealthChecks.io sends out alerts. This can be used with the hosted service or a self-hosted instance. This plugin provides dashboard widgets that display the status of all monitored checks, showing which cron jobs are running on schedule, which are late, and which have failed, all directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `https://healthchecks.io/api/v3/` or `http://{self-hosted}:{port}/api/v3/`
- **Authentication:** API key passed via `X-Api-Key` header (read-only or read-write key)
- **Key endpoints:**
  - `GET /api/v3/checks/` — List all checks with their status
  - `GET /api/v3/checks/{uuid}` — Get a specific check details
  - `GET /api/v3/checks/{uuid}/pings/` — List recent pings for a check
  - `GET /api/v3/checks/{uuid}/flips/` — List status changes for a check
  - `GET /api/v3/badges/{badge_key}/json` — Badge-style status summary

## Planned Configuration

| Setting                | Type    | Description                                       |
| ---------------------- | ------- | ------------------------------------------------- |
| `healthchecks_url`     | string  | Base URL (default: https://healthchecks.io)       |
| `healthchecks_api_key` | string  | API key (read-only recommended)                   |
| `poll_interval`        | number  | Refresh interval in seconds (default: 60)         |
| `show_paused`          | boolean | Whether to display paused checks (default: false) |

## Planned Widgets & Features

- **HealthChecks Status Widget:** Shows a summary of all checks grouped by status (up, down, grace, paused) with color-coded indicators. Displays the last ping time for each check.
- **Check Detail Widget:** Shows detailed information for critical checks including ping history, schedule, expected period, and grace period.
- **Alert Summary Widget:** Highlights checks that are currently down or in grace period with their last successful ping timestamp.

## Example API Response

```json
{
  "checks": [
    {
      "name": "Backup Script",
      "slug": "backup-script",
      "tags": "prod server1",
      "status": "up",
      "last_ping": "2024-01-15T03:00:00+00:00",
      "next_ping": "2024-01-16T03:00:00+00:00",
      "grace": 3600,
      "schedule": "0 3 * * *",
      "tz": "UTC"
    }
  ]
}
```

## Requirements

- A HealthChecks.io account (hosted or self-hosted instance)
- An API key with at least read-only permissions
- Cron jobs or scripts configured to ping HealthChecks.io
