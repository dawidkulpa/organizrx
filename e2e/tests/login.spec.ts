import { expect, test, type Page } from '@playwright/test'
import { LoginPage } from '../poms/login.page'

test.use({ storageState: { cookies: [], origins: [] } })

async function expectInvalidLoginError(page: Page) {
  const errorLocators = [
    page.getByRole('alert'),
    page.getByText(/invalid/i),
    page.locator('.text-red-500, .text-destructive'),
  ]

  await expect
    .poll(async () => {
      for (const locator of errorLocators) {
        if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
          return true
        }
      }

      return false
    })
    .toBe(true)
}

test('shows login form at /login', async ({ page }) => {
  await page.goto('/login')

  await expect(page.locator('#username')).toBeVisible()
  await expect(page.locator('#password')).toBeVisible()
  await expect(page.locator('button[type="submit"]')).toBeVisible()
})

test('redirects to dashboard after valid login', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('admin', 'TestPassword123!')
  await page.waitForURL('/')

  await expect(page).toHaveURL(/\/$/)
})

test('shows error message for invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('admin', 'WrongPassword!')

  await expectInvalidLoginError(page)
  await expect(page).toHaveURL(/\/login$/)
})

test('logout redirects to /login and protects routes', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.goto()
  await loginPage.login('admin', 'TestPassword123!')
  await page.waitForURL('/')
  await expect(page.locator('button[title="Logout"]')).toBeVisible()
  await page.click('button[title="Logout"]')
  await page.waitForURL('**/login')

  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/users')
  await page.waitForURL('**/login')
  await expect(page).toHaveURL(/\/login$/)
})
