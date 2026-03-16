import type { Page } from '@playwright/test'

export class SettingsPage {
  constructor(private page: Page) {}

  async gotoTabs() {
    await this.page.goto('/settings/tabs')
  }

  async gotoUsers() {
    await this.page.goto('/settings/users')
  }

  async gotoGeneral() {
    await this.page.goto('/settings/general')
  }

  async gotoAppearance() {
    await this.page.goto('/settings/appearance')
  }
}
