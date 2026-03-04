# Weather Plugin for OrganizrX

## Overview

The Weather plugin integrates OrganizrX with the [OpenWeatherMap API](https://openweathermap.org/api), providing a dashboard widget that displays current weather conditions and forecasts. This is a general-purpose utility widget that adds ambient information to your home server dashboard, allowing you to see the current temperature, weather conditions, wind speed, humidity, and a multi-day forecast without leaving OrganizrX. The plugin supports both metric and imperial units and can be configured for any location worldwide.

## Target API

- **Base URL pattern:** `https://api.openweathermap.org/data/2.5/` and `https://api.openweathermap.org/data/3.0/`
- **Authentication:** API key passed via `appid` query parameter
- **Key endpoints:**
  - `GET /data/2.5/weather?q={city}&appid={key}` — Current weather conditions
  - `GET /data/2.5/forecast?q={city}&appid={key}` — 5-day / 3-hour forecast
  - `GET /data/3.0/onecall?lat={lat}&lon={lon}&appid={key}` — One Call API (current + forecast + alerts)
  - Weather icon URLs: `https://openweathermap.org/img/wn/{icon}@2x.png`

## Planned Configuration

| Setting           | Type    | Description                                            |
| ----------------- | ------- | ------------------------------------------------------ |
| `weather_api_key` | string  | OpenWeatherMap API key (free tier available)           |
| `weather_city`    | string  | City name or coordinates for weather lookup            |
| `weather_units`   | string  | Temperature units: "metric", "imperial", or "standard" |
| `poll_interval`   | number  | Refresh interval in seconds (default: 600)             |
| `show_forecast`   | boolean | Whether to show multi-day forecast (default: true)     |

## Planned Widgets & Features

- **Weather Status Widget:** Displays current temperature, weather condition with icon, feels-like temperature, humidity, wind speed and direction, and atmospheric pressure in a compact card format.
- **Forecast Widget:** Shows a 5-day weather forecast with daily high/low temperatures, weather icons, and precipitation probability.
- **Detailed Conditions Widget:** Displays extended weather data including sunrise/sunset times, visibility, UV index, and cloud cover percentage.

## Example API Response

```json
{
  "main": {
    "temp": 22.5,
    "feels_like": 21.8,
    "humidity": 65,
    "pressure": 1013
  },
  "weather": [{ "main": "Clouds", "description": "scattered clouds", "icon": "03d" }],
  "wind": { "speed": 3.5, "deg": 220 },
  "name": "London"
}
```

## Requirements

- An OpenWeatherMap API key (free tier provides 1,000 calls/day)
- Internet connectivity from the OrganizrX server to api.openweathermap.org
