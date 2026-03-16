import { expect, test as setup } from '@playwright/test'
import { LoginPage } from '../poms/login.page'

setup('authenticate as admin through the real login UI', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('admin', 'TestPassword123!', true)
  await page.waitForURL('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
