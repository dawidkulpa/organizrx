# Manual Testing Guide: Tab Lifecycle & Iframe Flow

## Overview

This guide provides scenario-based manual testing procedures for the tab management system and iframe integration in OrganizrX. It covers the complete lifecycle of a tab from creation to deletion, focusing on the rendering engine and viewport management.

## Known Test URLs

| URL                             | Behavior                                                      |
| ------------------------------- | ------------------------------------------------------------- |
| https://example.com             | Embeddable — iframe loads successfully                        |
| https://status.public.dkulpa.eu | Embeddable — known valid service for testing                  |
| https://github.com              | Blocked — X-Frame-Options header present, error overlay shows |
| https://google.com              | Blocked — Same-origin policy / X-Frame-Options                |

## Key Selectors

| Element               | Selector                                 |
| --------------------- | ---------------------------------------- |
| Mounted tab container | `[data-mounted-tab-id="{id}"]`           |
| Iframe element        | `iframe[src="{url}"]`                    |
| Error overlay         | `[data-testid="iframe-error-overlay"]`   |
| Loading overlay       | `[data-testid="iframe-loading-overlay"]` |
| ManagedIframe wrapper | `div[data-tab-id="{id}"]`                |

---

## Group 1: Tab Creation → Iframe Rendering

### Scenario 1.1: Create external tab with embeddable URL [Playwright-automatable]

**Preconditions:**

- Logged in as admin
- On the Settings > Tabs page

**Steps:**

1. Click "Add Tab"
2. Enter Name: "Example"
3. Enter URL: `https://example.com`
4. Set Tab Type: External
5. Click "Save"
6. Navigate to Dashboard (`/`)
7. Click "Example" in the sidebar

**Expected Result:**
The iframe renders `https://example.com` successfully. No error or loading overlays are visible after the initial load.

### Scenario 1.2: Create external tab with blocked URL [Playwright-automatable]

**Preconditions:**

- Logged in as admin
- On the Settings > Tabs page

**Steps:**

1. Click "Add Tab"
2. Enter Name: "GitHub"
3. Enter URL: `https://github.com`
4. Set Tab Type: External
5. Click "Save"
6. Navigate to Dashboard (`/`)
7. Click "GitHub" in the sidebar

**Expected Result:**
The error overlay `[data-testid="iframe-error-overlay"]` appears with the message "This site blocks iframe embedding".

### Scenario 1.3: Create tab with empty/missing URL [Playwright-automatable]

**Preconditions:**

- Logged in as admin
- On the Settings > Tabs page

**Steps:**

1. Click "Add Tab"
2. Leave URL field empty
3. Attempt to Save

**Expected Result:**
Zod validation error appears for the URL field. Form cannot be submitted.

### Scenario 1.4: Create tab, navigate to dashboard WITHOUT reload [Manual-only]

**Preconditions:**

- Logged in as admin
- On the Settings > Tabs page

**Steps:**

1. Create a new valid tab (e.g., "Instant Tab")
2. Click "Save"
3. Click the "Home" or "Dashboard" link in the sidebar without refreshing the browser

**Expected Result:**
The "Instant Tab" should be immediately visible in the sidebar navigation list without requiring a page refresh.

---

## Group 2: Tab Navigation & Switching

### Scenario 2.1: Click tab in sidebar [Playwright-automatable]

**Preconditions:**

- Multiple tabs created (e.g., Tab A, Tab B)
- On the Dashboard

**Steps:**

1. Click "Tab A" in the sidebar
2. Wait for load
3. Click "Tab B" in the sidebar

**Expected Result:**
URL changes to `/tab/{id_a}` and then `/tab/{id_b}`. The viewport updates to show the correct iframe for each.

### Scenario 2.2: Switch between two tabs (Persistence check) [Playwright-automatable]

**Preconditions:**

- Two tabs created (Tab A and Tab B)
- On Tab A

**Steps:**

1. Observe Tab A is mounted: `[data-mounted-tab-id="{id_a}"]` is visible
2. Click Tab B in sidebar
3. Observe Tab B is mounted: `[data-mounted-tab-id="{id_b}"]` is visible
4. Check DOM for Tab A

**Expected Result:**
`[data-mounted-tab-id="{id_a}"]` still exists in the DOM but has the class `invisible` or is hidden via CSS. Switching back to Tab A happens instantly without iframe reload.

### Scenario 2.3: Navigate to /tab/:id directly [Playwright-automatable]

**Preconditions:**

- Valid tab exists with ID `5`

**Steps:**

1. Type `http://localhost:5173/tab/5` directly into the browser address bar
2. Press Enter

**Expected Result:**
App loads, sidebar highlights Tab 5, and the iframe for Tab 5 renders in the viewport.

### Scenario 2.4: Navigate to /tab/999999 (nonexistent ID) [Playwright-automatable]

**Preconditions:**

- Tab with ID `999999` does NOT exist

**Steps:**

1. Navigate directly to `/tab/999999`

**Expected Result:**
The application redirects the user to the dashboard (`/`). No crash occurs.

---

## Group 3: Iframe Lifecycle

### Scenario 3.1: Tab loads slowly → loading overlay [Manual-only]

**Preconditions:**

- A tab exists that takes > 2 seconds to respond (can be simulated with a slow network or local test server)
- Splash is enabled for the tab

**Steps:**

1. Click the slow tab in the sidebar

**Expected Result:**
The loading overlay `[data-testid="iframe-loading-overlay"]` with the "OrganizrX" spinner appears while the iframe is loading.

### Scenario 3.2: Tab with splash=false [Playwright-automatable]

**Preconditions:**

- Tab created with "Splash" option disabled

**Steps:**

1. Click the tab in the sidebar

**Expected Result:**
The loading overlay `[data-testid="iframe-loading-overlay"]` never appears. The iframe (or empty background) is visible immediately.

### Scenario 3.3: Blocked tab actions [Playwright-automatable]

**Preconditions:**

- Tab pointing to `https://github.com` (blocked)

**Steps:**

1. Open the blocked tab
2. Click the "Open in New Tab" link in the error overlay

**Expected Result:**
A new browser tab opens with `https://github.com`. The link has `rel="noopener noreferrer"`.

### Scenario 3.4: Retry button on timed-out tab [Manual-only]

**Preconditions:**

- Set a very short timeout for a tab (e.g., 100ms) to trigger a timeout error
- OR simulate a network timeout

**Steps:**

1. Open the tab
2. Wait for "This tab took too long to load" error overlay
3. Click "Retry"

**Expected Result:**
The error overlay disappears, the loading overlay reappears (if splash=true), and the iframe attempts to load again (new `key` triggered in React).

---

## Group 4: Tab Editing

### Scenario 4.1: Edit tab URL in Settings [Playwright-automatable]

**Preconditions:**

- Tab "Old URL" exists pointing to `https://example.com`

**Steps:**

1. Go to Settings > Tabs
2. Edit "Old URL" tab
3. Change URL to `https://status.public.dkulpa.eu`
4. Save
5. Go to Dashboard and click the tab

**Expected Result:**
The iframe loads the NEW URL (`https://status.public.dkulpa.eu`).

### Scenario 4.2: Disable tab [Playwright-automatable]

**Preconditions:**

- An active tab "Visible Tab" exists

**Steps:**

1. Go to Settings > Tabs
2. Toggle the "Enabled" switch to OFF for "Visible Tab"
3. Save
4. Go to Dashboard

**Expected Result:**
"Visible Tab" is no longer present in the sidebar. Navigating directly to its `/tab/:id` redirects to the dashboard.

### Scenario 4.3: Re-enable tab [Playwright-automatable]

**Preconditions:**

- A disabled tab "Hidden Tab" exists

**Steps:**

1. Go to Settings > Tabs
2. Toggle the "Enabled" switch to ON for "Hidden Tab"
3. Save
4. Go to Dashboard

**Expected Result:**
"Hidden Tab" reappears in the sidebar and functions normally.

### Scenario 4.4: Change tab type from External to non-external [Playwright-automatable]

**Preconditions:**

- An existing external tab "External Tab" pointing to `https://example.com` is enabled and visible in the sidebar

**Steps:**

1. Go to Settings > Tabs
2. Edit "External Tab"
3. Change Tab Type from "External" to any non-external type (e.g., "Internal")
4. Save
5. Navigate to Dashboard
6. Click "External Tab" in the sidebar

**Expected Result:**
No `<iframe>` is rendered. The tab does NOT attempt to load `https://example.com` in an iframe. The user is redirected to `/` or the appropriate internal route. The `[data-mounted-tab-id]` container, if present, does not contain an `<iframe>` element.

---

## Group 5: Tab Deletion

### Scenario 5.1: Delete tab while viewing it [Playwright-automatable]

**Preconditions:**

- Currently viewing Tab "To Be Deleted" at `/tab/123`

**Steps:**

1. (In another window or by navigating) Delete Tab "To Be Deleted"
2. Observe the behavior in the current view

**Expected Result:**
The user is redirected to the dashboard (`/`). The tab is removed from the sidebar.

### Scenario 5.2: Delete tab while viewing a different tab [Playwright-automatable]

**Preconditions:**

- Viewing "Keep Me" (Tab 1)
- Delete "Delete Me" (Tab 2)

**Steps:**

1. While on Tab 1, perform the deletion of Tab 2 (via Settings or API)

**Expected Result:**
"Delete Me" is removed from the sidebar. Tab 1 remains visible and active. The iframe for Tab 1 is unaffected.

---

## Group 6: Sidebar Interaction

### Scenario 6.1: Tab categories [Playwright-automatable]

**Preconditions:**

- Category "Media" created
- Tab "Plex" assigned to "Media"

**Steps:**

1. View the sidebar

**Expected Result:**
The "Plex" tab appears nested under the "Media" category header.

### Scenario 6.2: Tab with preload=true [Playwright-automatable]

**Preconditions:**

- Tab "Background Load" created with `preload: true`
- User is on the Dashboard (not yet clicked the tab)

**Steps:**

1. Inspect the DOM on initial page load

**Expected Result:**
`[data-mounted-tab-id="{id}"]` and the corresponding `iframe` exist in the DOM even if the user has not clicked the tab yet.

### Scenario 6.3: Multiple tabs in sidebar [Playwright-automatable]

**Preconditions:**

- 5+ tabs created across different categories

**Steps:**

1. Navigate through all tabs one by one

**Expected Result:**
Each tab shows the correct content. The sidebar highlight moves correctly to the active tab. No performance degradation or "ghost" iframes from previous clicks (only the active one is visible).

### Scenario 6.4: Tab ordering matches configured order [Manual-only]

**Preconditions:**

- At least 3 tabs exist with explicitly set `order` values (e.g., Tab A: order=1, Tab B: order=2, Tab C: order=3)
- Logged in as admin

**Steps:**

1. Go to Settings > Tabs and note the configured `order` values for each tab
2. Navigate to the Dashboard
3. Compare the visual order of tabs in the sidebar against the configured `order` values

**Expected Result:**
Tabs appear in the sidebar in ascending `order` value sequence. Tab A (order=1) appears first, Tab B (order=2) second, Tab C (order=3) third. Changing an order value in Settings and saving causes the sidebar order to update accordingly.
