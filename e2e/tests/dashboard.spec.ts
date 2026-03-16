import { expect, test } from '@playwright/test'

test('shows Dashboard heading at /', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('sidebar shows admin username', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('aside')).toContainText('admin')
})

test('dashboard loads without console errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  expect(errors).toHaveLength(0)
})

test('navigating away and back shows Dashboard heading', async ({ page }) => {
  await page.goto('/settings/general')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
