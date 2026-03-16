import { expect, type Page } from '@playwright/test'

export class SidebarPage {
  constructor(private readonly page: Page) {}

  private get sidebar() {
    return this.page.locator('aside')
  }

  async waitForLoaded() {
    await expect(this.sidebar).toBeVisible()
  }

  async expectUser(username: string) {
    await expect(this.sidebar.getByText(username)).toBeVisible()
  }

  async openTab(name: string) {
    await this.sidebar.getByRole('link', { name }).click()
  }

  async logout() {
    await this.sidebar.locator('button[title="Logout"]').click()
  }
}
