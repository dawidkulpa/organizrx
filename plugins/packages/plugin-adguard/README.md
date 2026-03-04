# AdGuard Home Plugin for OrganizrX

## Overview

The AdGuard Home plugin integrates OrganizrX with [AdGuard Home](https://adguard.com/en/adguard-home/overview.html), a network-wide software for blocking ads and tracking. AdGuard Home operates as a DNS server that re-routes tracking domains to a "black hole," thus preventing your devices from connecting to those servers. Compared to Pi-hole, AdGuard Home offers built-in HTTPS filtering, parental controls, and safe browsing features. This plugin provides dashboard widgets that display real-time DNS statistics, filtering ratios, and protection status within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `http://{host}:{port}/control/`
- **Authentication:** HTTP Basic authentication with username and password
- **Key endpoints:**
  - `GET /control/status` — Service status and configuration
  - `GET /control/stats` — DNS query statistics
  - `GET /control/stats/top` — Top clients, queried domains, and blocked domains
  - `POST /control/dns_config` — Update DNS configuration
  - `POST /control/protection` — Enable or disable protection
  - `GET /control/querylog` — Recent query log entries

## Planned Configuration

| Setting            | Type   | Description                               |
| ------------------ | ------ | ----------------------------------------- |
| `adguard_url`      | string | Base URL of the AdGuard Home instance     |
| `adguard_username` | string | Username for HTTP Basic auth              |
| `adguard_password` | string | Password for HTTP Basic auth              |
| `poll_interval`    | number | Refresh interval in seconds (default: 10) |

## Planned Widgets & Features

- **AdGuard Status Widget:** Shows DNS queries today, blocked queries, filtering percentage, active filter rules count, and a toggle for enabling/disabling protection.
- **Query Statistics Widget:** A chart showing DNS queries and blocked queries over time with daily, weekly, or monthly views.
- **Top Domains Widget:** Lists the most queried and most blocked domains with query counts and client information.

## Example API Response

```json
{
  "num_dns_queries": 98765,
  "num_blocked_filtering": 12345,
  "num_replaced_safebrowsing": 50,
  "num_replaced_parental": 10,
  "avg_processing_time": 0.005,
  "protection_enabled": true
}
```

## Requirements

- A running AdGuard Home instance accessible from the OrganizrX server
- AdGuard Home web interface credentials (username and password)
- Network connectivity between OrganizrX and the AdGuard Home instance
