import type { Page } from '@playwright/test'

export class WizardPage {
  constructor(private page: Page) {}

  async waitForWizard() {
    await this.page.waitForURL('/wizard')
  }

  async fillAdminCredentials(username: string, password: string) {
    await this.page.fill('input[name="username"], #username', username)
    await this.page.fill('input[name="password"], #password', password)
  }

  async clickNext() {
    await this.page.click('button:has-text("Next"), button:has-text("Continue")')
  }

  async clickFinish() {
    await this.page.click(
      'button:has-text("Finish"), button:has-text("Complete"), button:has-text("Done")'
    )
  }
}
