import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('wizard route redirects to login when setup is complete', async ({ page }) => {
  await page.goto('/wizard')

  await page.waitForURL('**/login')
  await expect(page.getByRole('heading', { name: 'OrganizrX' })).toBeVisible()
})
