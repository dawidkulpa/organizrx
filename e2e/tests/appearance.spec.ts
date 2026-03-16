import { expect, test } from '@playwright/test'

test('shows Appearance heading at /settings/appearance', async ({ page }) => {
  await page.goto('/settings/appearance')
  await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible()
})

test('theme select is visible', async ({ page }) => {
  await page.goto('/settings/appearance')
  await expect(page.locator('#theme')).toBeVisible()
})

test('changing theme makes form dirty and enables save', async ({ page }) => {
  await page.goto('/settings/appearance')
  await page.locator('#theme').selectOption('light')
  await expect(page.getByText('Unsaved changes')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).not.toBeDisabled()
})

test('saving appearance persists after page reload', async ({ page }) => {
  await page.goto('/settings/appearance')
  await page.locator('#theme').selectOption('light')
  await page.locator('button[type="submit"]').click()
  await expect(page.getByText('Settings saved successfully')).toBeVisible()

  await page.reload()
  await expect(page.locator('#theme')).toHaveValue('light')
})
