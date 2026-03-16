import { expect, type Page } from '@playwright/test'

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto(section: string = 'general') {
    await this.page.goto(`/settings/${section}`)
    await expect(this.page.getByText('Settings')).toBeVisible()
  }

  async openSection(name: string) {
    await this.page.getByRole('link', { name }).click()
  }

  field(label: string) {
    return this.page.getByLabel(label)
  }
}
