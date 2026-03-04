# Pi-hole Plugin for OrganizrX

## Overview

The Pi-hole plugin integrates OrganizrX with [Pi-hole](https://pi-hole.net/), a network-wide DNS-level ad blocker that acts as a DNS sinkhole to protect devices from unwanted content. Pi-hole provides comprehensive statistics about DNS queries, blocked domains, and network activity. This plugin provides dashboard widgets that display real-time DNS statistics, blocking ratios, top queried domains, and the ability to enable or disable blocking directly from the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}/admin/api.php`
- **Authentication:** API token (derived from the web interface password) passed via `auth` query parameter
- **Key endpoints:**
  - `GET /admin/api.php?summary` — Overall statistics summary
  - `GET /admin/api.php?topItems&auth={token}` — Top permitted and blocked domains
  - `GET /admin/api.php?getQuerySources&auth={token}` — Top client devices
  - `GET /admin/api.php?overTimeData10mins` — Query data over time (10 min intervals)
  - `GET /admin/api.php?enable&auth={token}` — Enable blocking
  - `GET /admin/api.php?disable=300&auth={token}` — Disable blocking for 5 minutes

## Planned Configuration

| Setting            | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `pihole_url`       | string  | Base URL of the Pi-hole admin interface        |
| `pihole_api_token` | string  | API token for authenticated requests           |
| `poll_interval`    | number  | Refresh interval in seconds (default: 10)      |
| `show_top_domains` | boolean | Whether to display top queried/blocked domains |

## Planned Widgets & Features

- **Pi-hole Status Widget:** Shows total queries today, queries blocked, blocking percentage, and domains on blocklist. Includes a toggle button to enable/disable blocking.
- **Query Graph Widget:** A bar chart showing DNS queries over time with blocked vs. permitted queries stacked.
- **Top Domains Widget:** Lists the most queried and most blocked domains with query counts.

## Example API Response

```json
{
  "domains_being_blocked": 125432,
  "dns_queries_today": 54321,
  "ads_blocked_today": 12345,
  "ads_percentage_today": 22.73,
  "unique_domains": 4567,
  "queries_forwarded": 30000,
  "queries_cached": 11976,
  "status": "enabled"
}
```

## Requirements

- A running Pi-hole instance accessible from the OrganizrX server
- The Pi-hole web interface password (for generating the API token)
- Network connectivity between OrganizrX and the Pi-hole instance
