import { expect, test } from '@playwright/test'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { WizardPage } from '../poms/wizard.page'

const DB_PATH = '/tmp/e2e-organizrx.db'
const migrationFiles = ['0000_young_young_avengers.sql', '0001_wandering_hellion.sql']

test.describe.configure({ mode: 'serial' })
test.use({ storageState: undefined })

function runMigrationFile(db: { run: (sql: string) => unknown }, fileName: string) {
  const migration = readFileSync(resolve(process.cwd(), 'apps/server/drizzle', fileName), 'utf-8')

  for (const statement of migration.split('--> statement-breakpoint')) {
    const sql = statement.trim()

    if (sql) {
      db.run(sql)
    }
  }
}

async function resetDatabase(seed: boolean = false) {
  const { Database } = await import('bun:sqlite')

  rmSync(DB_PATH, { force: true })

  const db = new Database(DB_PATH)

  try {
    for (const migrationFile of migrationFiles) {
      runMigrationFile(db, migrationFile)
    }

    if (seed) {
      const { seedE2eData } = await import('../setup/seed')
      await seedE2eData(db)
    }
  } finally {
    db.close()
  }
}

test.beforeAll(async () => {
  await resetDatabase()
})

test.afterAll(async () => {
  await resetDatabase(true)
})

test('redirects to wizard when no admin exists', async ({ page }) => {
  const wizardPage = new WizardPage(page)

  await page.goto('/')
  await wizardPage.waitForWizard()

  await expect(page.getByRole('heading', { name: 'OrganizrX Setup' })).toBeVisible()
})

test('completes step 1 (welcome) and advances to step 2', async ({ page }) => {
  const wizardPage = new WizardPage(page)

  await page.goto('/wizard')
  await expect(page.getByRole('heading', { name: 'Welcome to OrganizrX' })).toBeVisible()

  await wizardPage.clickNext()

  await expect(page.locator('#wiz-username')).toBeVisible()
})

test('fills admin credentials and advances through steps', async ({ page }) => {
  const wizardPage = new WizardPage(page)

  await page.goto('/wizard')
  await wizardPage.clickNext()
  await wizardPage.fillAdminCredentials('wizadmin', 'wizard@test.com', 'WizPass123!', 'WizPass123!')
  await wizardPage.clickNext()
  await wizardPage.fillSettingsStep('Wizard Test Site')
  await wizardPage.clickNext()

  await expect(page.getByRole('heading', { name: 'Ready to Go!' })).toBeVisible()
  await expect(page.getByText('Wizard Test Site')).toBeVisible()
})

test('completes wizard and redirects to login', async ({ page }) => {
  const wizardPage = new WizardPage(page)

  await page.goto('/wizard')
  await wizardPage.clickNext()
  await wizardPage.fillAdminCredentials(
    'wizcomplete',
    'complete@test.com',
    'WizPass123!',
    'WizPass123!'
  )
  await wizardPage.clickNext()
  await wizardPage.fillSettingsStep('Wizard Complete Site')
  await wizardPage.clickNext()

  await expect(page.getByRole('heading', { name: 'Ready to Go!' })).toBeVisible()

  await wizardPage.clickCompleteSetup()
  await page.waitForURL('**/login')
})
