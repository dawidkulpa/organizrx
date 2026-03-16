import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login')
  }

  async login(username: string, password: string) {
    await this.page.fill('#username', username)
    await this.page.fill('#password', password)
    await this.page.click('button[type="submit"]')
  }

  async loginAndWait(username: string, password: string) {
    await this.login(username, password)
    await this.page.waitForURL('/')
  }
}
