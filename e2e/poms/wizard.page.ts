import { expect, type Page } from '@playwright/test'

export class WizardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/wizard')
    await expect(this.page.getByRole('heading', { name: 'OrganizrX Setup' })).toBeVisible()
  }

  async waitForWizard() {
    await this.page.waitForURL('**/wizard')
  }

  async fillAdminCredentials(
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) {
    await this.page.fill('#wiz-username', username)
    await this.page.fill('#wiz-email', email)
    await this.page.fill('#wiz-password', password)
    await this.page.fill('#wiz-confirm', confirmPassword)
  }

  async fillEmail(email: string) {
    await this.page.fill('#wiz-email', email)
  }

  async fillSettingsStep(siteTitle: string) {
    await this.page.fill('#wiz-title', siteTitle)
  }

  async clickNext() {
    await this.page.click('button:has-text("Next")')
  }

  async clickCompleteSetup() {
    await this.page.click('button:has-text("Complete Setup")')
  }
}
