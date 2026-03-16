import { expect, test, type Page } from '@playwright/test'

async function gotoTabsSettings(page: Page) {
  await page.goto('/settings/tabs')
  await expect(page.getByRole('heading', { name: 'Tab Management' })).toBeVisible()
}

async function createTab(page: Page, name: string, url: string) {
  await page.getByRole('button', { name: 'Add Tab' }).click()
  await expect(page.getByRole('heading', { name: 'Add New Tab' })).toBeVisible()
  await page.getByPlaceholder('My Dashboard').fill(name)
  await page.getByPlaceholder('https://example.com').fill(url)
  await page.getByRole('button', { name: 'Create Tab' }).click()
}

test('displays tab list on /settings/tabs', async ({ page }) => {
  await gotoTabsSettings(page)

  await expect(page.getByText('Tab1', { exact: true })).toBeVisible()
  await expect(page.getByText('Tab2', { exact: true })).toBeVisible()
  await expect(page.getByText('Tab3', { exact: true })).toBeVisible()
})

test('creates a new tab and sidebar updates without page refresh', async ({ page }) => {
  await gotoTabsSettings(page)

  await createTab(page, 'E2E-Tab-CRUD', 'https://example.com')

  await expect(page.locator('aside').getByRole('link', { name: 'E2E-Tab-CRUD' })).toBeVisible()
})

test('edit button opens edit modal', async ({ page }) => {
  await gotoTabsSettings(page)

  await page.locator('button[title="Edit"]').first().click()
  await expect(page.getByRole('heading', { name: 'Edit Tab' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})

test('deletes a tab and removes it from the list', async ({ page }) => {
  await gotoTabsSettings(page)

  await createTab(page, 'TabToDelete', 'https://delete-me.example.com')

  const tabsList = page.locator('[data-rfd-droppable-id="tabs-list"]')

  await page.getByPlaceholder('Search tabs...').fill('TabToDelete')
  page.once('dialog', (dialog) => dialog.accept())
  await tabsList.locator('button[title="Delete"]').click()

  await expect(tabsList.getByText('TabToDelete', { exact: true })).not.toBeVisible()
})
