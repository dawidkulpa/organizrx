import { expect, test } from '@playwright/test'

test('displays tabs in seeded order on /settings/tabs', async ({ page }) => {
  await page.goto('/settings/tabs')
  await expect(page.getByRole('heading', { name: 'Tab Management' })).toBeVisible()

  const rows = page.locator('[data-rfd-droppable-id="tabs-list"] > div')
  await expect(rows.nth(0)).toContainText('Tab1')
  await expect(rows.nth(1)).toContainText('Tab2')
  await expect(rows.nth(2)).toContainText('Tab3')
})

test('tab order is preserved on page refresh', async ({ page }) => {
  await page.goto('/settings/tabs')
  await page.reload()

  const rows = page.locator('[data-rfd-droppable-id="tabs-list"] > div')
  await expect(rows.nth(0)).toContainText('Tab1')
  await expect(rows.nth(1)).toContainText('Tab2')
})

test('tab order is preserved after navigation', async ({ page }) => {
  await page.goto('/settings/tabs')
  await page.goto('/')
  await page.goto('/settings/tabs')

  const rows = page.locator('[data-rfd-droppable-id="tabs-list"] > div')
  await expect(rows.nth(0)).toContainText('Tab1')
  await expect(rows.nth(1)).toContainText('Tab2')
})
