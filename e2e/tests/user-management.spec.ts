import { expect, test } from '@playwright/test'

test('shows Users heading at /settings/users', async ({ page }) => {
  await page.goto('/settings/users')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
})

test('shows seeded users in the user list', async ({ page }) => {
  await page.goto('/settings/users')
  await expect(page.getByText('admin')).toBeVisible()
  await expect(page.getByText('testuser')).toBeVisible()
})

test('opens invite dialog when Generate Invite is clicked', async ({ page }) => {
  await page.goto('/settings/users')
  await page.getByRole('button', { name: /Generate Invite/i }).click()
  await expect(page.getByRole('heading', { name: 'Manage Invites' })).toBeVisible()
})

test('generates a new invite code', async ({ page }) => {
  await page.goto('/settings/users')
  await page.getByRole('button', { name: /Generate Invite/i }).click()
  await expect(page.getByRole('heading', { name: 'Manage Invites' })).toBeVisible()

  await page.getByRole('button', { name: 'Generate New Invite' }).click()

  await expect(page.locator('span.font-mono').first()).toBeVisible()
})

test('closes invite dialog', async ({ page }) => {
  await page.goto('/settings/users')
  await page.getByRole('button', { name: /Generate Invite/i }).click()
  await expect(page.getByRole('heading', { name: 'Manage Invites' })).toBeVisible()

  await page
    .locator('div.fixed.inset-0')
    .getByRole('button', { name: '' })
    .first()
    .click()
    .catch(() => page.mouse.click(10, 10))

  await expect(page.getByRole('heading', { name: 'Manage Invites' })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
})
