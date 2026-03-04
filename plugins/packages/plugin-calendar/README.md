# Calendar Plugin for OrganizrX

## Overview

The Calendar plugin integrates OrganizrX with iCal and CalDAV calendar services, providing a dashboard widget that displays upcoming calendar events. This plugin can consume any standard iCalendar (`.ics`) feed, including Google Calendar, Apple Calendar, Nextcloud Calendar, Radicale, and any other service that exposes iCal/CalDAV endpoints. This allows users to see their upcoming schedule alongside their media server dashboard, combining personal organization with home server management in a single interface.

## Target API

- **URL patterns:**
  - iCal feeds: `https://{host}/calendar.ics` (read-only ICS file)
  - CalDAV: `https://{host}:{port}/dav/calendars/{user}/{calendar}/` (full CalDAV protocol)
  - Google Calendar: `https://calendar.google.com/calendar/ical/{id}/public/basic.ics`
- **Authentication:** Depends on provider — HTTP Basic auth for CalDAV, public URL for shared iCal feeds, API key for some services
- **Protocol:** iCalendar (RFC 5545) for read-only feeds, CalDAV (RFC 4791) for read-write access

## Planned Configuration

| Setting             | Type     | Description                                       |
| ------------------- | -------- | ------------------------------------------------- |
| `calendar_feeds`    | string[] | List of iCal feed URLs to subscribe to            |
| `calendar_username` | string   | Username for CalDAV authentication (optional)     |
| `calendar_password` | string   | Password for CalDAV authentication (optional)     |
| `poll_interval`     | number   | Refresh interval in seconds (default: 300)        |
| `days_ahead`        | number   | Number of days ahead to show events (default: 7)  |
| `max_events`        | number   | Maximum number of events to display (default: 10) |

## Planned Widgets & Features

- **Calendar Status Widget:** Displays a list of upcoming events with date, time, title, and calendar source color-coded by calendar feed. Shows a "today" highlight and relative time (e.g., "in 2 hours").
- **Week View Widget:** A compact week view showing events laid out across days with time slots.
- **Agenda Widget:** A scrollable agenda-style list of events grouped by day.

## Example Data (iCal Format)

```
BEGIN:VEVENT
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly sync
LOCATION:Zoom
END:VEVENT
```

## Requirements

- One or more iCal feed URLs or CalDAV server endpoints
- Network/internet connectivity to reach the calendar services
- For private calendars, valid authentication credentials
