import { test as setup } from '@playwright/test'
import { mkdirSync } from 'fs'

setup('authenticate as admin', async ({ page }) => {
  mkdirSync('e2e/.auth', { recursive: true })

  await page.goto('/login')
  await page.fill('#username', 'admin')
  await page.fill('#password', 'TestPassword123!')
  await page.click('button[type="submit"]')
  await page.waitForURL('/')

  await page.context().storageState({ path: 'e2e/.auth/admin.json' })
})
