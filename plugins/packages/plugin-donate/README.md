# Donate Plugin for OrganizrX

## Overview

The Donate plugin provides a configurable donation widget for OrganizrX dashboards. This plugin is designed for server administrators who share their media server with friends, family, or community members and want to provide an easy way for users to contribute to server costs. The widget displays customizable donation links to various payment platforms such as Stripe, PayPal, Buy Me a Coffee, Ko-fi, and Patreon. It does not process payments directly but rather provides attractive, configurable buttons and messages that link to external payment pages.

## Target API

- **No external API required** — This plugin does not integrate with an external service API
- **Payment links are user-configured** and can point to:
  - PayPal.me: `https://paypal.me/{username}`
  - Stripe Payment Links: `https://buy.stripe.com/{link_id}`
  - Buy Me a Coffee: `https://buymeacoffee.com/{username}`
  - Ko-fi: `https://ko-fi.com/{username}`
  - Patreon: `https://patreon.com/{username}`
  - Custom URLs for any other payment platform

## Planned Configuration

| Setting           | Type     | Description                                      |
| ----------------- | -------- | ------------------------------------------------ |
| `donate_title`    | string   | Widget title (default: "Support This Server")    |
| `donate_message`  | string   | Custom message to display above donation links   |
| `donate_links`    | object[] | Array of link objects with { label, url, icon }  |
| `donate_goal`     | number   | Optional monthly goal amount to display progress |
| `donate_currency` | string   | Currency symbol to display (default: "$")        |

## Planned Widgets & Features

- **Donate Status Widget:** Displays a customizable card with a thank-you message, donation buttons linking to configured payment platforms, and an optional progress bar showing progress toward a monthly donation goal.
- **Support Card Widget:** A minimal widget showing a single prominent donation button with a short message for embedding in dashboards without taking too much space.
- **Goal Progress Widget:** Shows a visual progress bar toward a configurable monthly/annual donation goal with current amount and percentage.

## Example Configuration

```json
{
  "donate_title": "Help Keep the Server Running",
  "donate_message": "Your contributions help cover hosting, electricity, and hardware costs.",
  "donate_links": [
    { "label": "PayPal", "url": "https://paypal.me/myserver", "icon": "paypal" },
    { "label": "Buy Me a Coffee", "url": "https://buymeacoffee.com/myserver", "icon": "coffee" }
  ],
  "donate_goal": 50,
  "donate_currency": "$"
}
```

## Requirements

- No external service requirements — this is a static widget
- One or more payment platform accounts with shareable payment links
- Links must be configured by the server administrator in plugin settings
