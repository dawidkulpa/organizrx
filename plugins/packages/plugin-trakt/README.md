# Trakt Plugin for OrganizrX

## Overview

The Trakt plugin integrates OrganizrX with [Trakt.tv](https://trakt.tv/), a platform for tracking TV shows and movies you watch. Trakt integrates with media centers like Plex, Kodi, and Emby to automatically scrobble what you watch, building a comprehensive viewing history. This plugin provides dashboard widgets that display your recent watch history, upcoming episodes from your watchlist, trending TV shows and movies, and personalized recommendations directly within the OrganizrX dashboard.

## Target API

- **Base URL pattern:** `https://api.trakt.tv/`
- **Authentication:** OAuth 2.0 with `trakt-api-key` (Client ID) header and `Authorization: Bearer {token}` for user-specific data
- **Key endpoints:**
  - `GET /users/{user}/history` — User's watch history
  - `GET /users/{user}/watchlist` — User's watchlist
  - `GET /calendars/my/shows` — Upcoming episodes for tracked shows
  - `GET /shows/trending` — Currently trending TV shows
  - `GET /movies/trending` — Currently trending movies
  - `GET /users/{user}/stats` — User viewing statistics

## Planned Configuration

| Setting               | Type   | Description                                 |
| --------------------- | ------ | ------------------------------------------- |
| `trakt_client_id`     | string | Trakt API client ID                         |
| `trakt_client_secret` | string | Trakt API client secret                     |
| `trakt_access_token`  | string | OAuth access token (obtained via auth flow) |
| `trakt_username`      | string | Trakt username for public data              |
| `poll_interval`       | number | Refresh interval in seconds (default: 300)  |

## Planned Widgets & Features

- **Trakt Status Widget:** Displays a summary of recent watching activity including last watched show/movie, total episodes and movies watched this week, and watching streak information.
- **Watch History Widget:** A scrollable feed of recently watched episodes and movies with poster art, ratings, and watch timestamps.
- **Upcoming Episodes Widget:** Lists upcoming episodes from shows on the user's watchlist with air dates and network information.
- **Trending Widget:** Shows currently trending TV shows and movies on the Trakt platform with community ratings.

## Example API Response

```json
{
  "watched_at": "2024-01-15T20:30:00.000Z",
  "action": "watch",
  "type": "episode",
  "episode": {
    "season": 3,
    "number": 5,
    "title": "The Door",
    "ids": { "trakt": 123456, "imdb": "tt1234567" }
  },
  "show": {
    "title": "Breaking Bad",
    "year": 2008
  }
}
```

## Requirements

- A Trakt.tv account (free)
- A Trakt API application registered at trakt.tv/oauth/applications
- OAuth authorization completed to access user-specific data
