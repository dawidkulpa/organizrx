import type { Page } from '@playwright/test'

export class SidebarPage {
  constructor(private page: Page) {}

  async getTabNames(): Promise<string[]> {
    return this.page.locator('nav a span.truncate').allTextContents()
  }

  async clickTab(name: string) {
    await this.page.getByRole('link', { name, exact: true }).click()
  }

  async waitForTab(name: string) {
    await this.page.getByRole('link', { name, exact: true }).waitFor()
  }

  async waitForTabGone(name: string) {
    await this.page.getByRole('link', { name, exact: true }).waitFor({ state: 'detached' })
  }
}
