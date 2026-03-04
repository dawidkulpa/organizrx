# YouTube Search Plugin for OrganizrX

## Overview

The YouTube Search plugin integrates OrganizrX with the [YouTube Data API v3](https://developers.google.com/youtube/v3), providing a dashboard widget that allows users to search for YouTube videos directly from the OrganizrX dashboard. This plugin is useful for media server communities where users may want to discover trailers, reviews, or behind-the-scenes content for the movies and TV shows available on their server. The widget displays search results with video thumbnails, titles, channel names, and view counts, with the ability to play videos inline or open them in a new tab.

## Target API

- **Base URL pattern:** `https://www.googleapis.com/youtube/v3/`
- **Authentication:** API key passed via `key` query parameter (YouTube Data API v3 key from Google Cloud Console)
- **Key endpoints:**
  - `GET /youtube/v3/search?part=snippet&q={query}&key={key}` — Search for videos
  - `GET /youtube/v3/videos?part=snippet,statistics&id={id}&key={key}` — Get video details
  - `GET /youtube/v3/channels?part=snippet&id={id}&key={key}` — Get channel information
  - `GET /youtube/v3/search?part=snippet&type=video&relatedToVideoId={id}` — Find related videos

## Planned Configuration

| Setting           | Type   | Description                                                            |
| ----------------- | ------ | ---------------------------------------------------------------------- |
| `youtube_api_key` | string | YouTube Data API v3 key from Google Cloud Console                      |
| `max_results`     | number | Maximum number of search results to display (default: 10)              |
| `safe_search`     | string | Safe search filter: "none", "moderate", "strict" (default: "moderate") |
| `default_query`   | string | Default search query shown on widget load (optional)                   |
| `region_code`     | string | ISO 3166-1 alpha-2 country code for regional results (optional)        |

## Planned Widgets & Features

- **YouTube Search Widget:** A search box with results displayed as a grid of video thumbnails. Each result shows the video thumbnail, title, channel name, publish date, and view count. Clicking opens the video in a modal player or new tab.
- **Trending Videos Widget:** Displays currently trending videos for the configured region without requiring a search query.
- **Channel Feed Widget:** Shows recent videos from a configured list of YouTube channels (e.g., movie trailer channels).

## Example API Response

```json
{
  "items": [
    {
      "id": { "videoId": "dQw4w9WgXcQ" },
      "snippet": {
        "title": "Movie Trailer - Official HD",
        "description": "Watch the official trailer for...",
        "channelTitle": "MovieTrailers",
        "publishedAt": "2024-01-15T10:00:00Z",
        "thumbnails": {
          "medium": { "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" }
        }
      }
    }
  ]
}
```

## Requirements

- A Google Cloud project with the YouTube Data API v3 enabled
- A YouTube Data API key (free tier provides 10,000 quota units/day)
- Internet connectivity from the OrganizrX server to googleapis.com
