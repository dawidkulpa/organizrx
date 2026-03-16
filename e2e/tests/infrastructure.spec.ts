import { expect, test } from '@playwright/test'
import { SidebarPage } from '../poms/sidebar.page'
import { SettingsPage } from '../poms/settings.page'

test('authenticated admin can reach seeded areas', async ({ page }) => {
  const sidebar = new SidebarPage(page)
  const settings = new SettingsPage(page)

  await page.goto('/')
  await sidebar.waitForLoaded()
  await sidebar.expectUser('admin')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await settings.goto('general')
  await expect(settings.field('Site Title')).toHaveValue('OrganizrX')

  await settings.openSection('Users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
})
