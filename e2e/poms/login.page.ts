import { expect, type Page } from '@playwright/test'

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login')
    await expect(this.page.getByRole('heading', { name: 'OrganizrX' })).toBeVisible()
  }

  async login(username: string, password: string, rememberMe = true) {
    await this.page.getByLabel('Username').fill(username)
    await this.page.getByLabel('Password').fill(password)

    const rememberMeCheckbox = this.page.getByLabel('Remember me')
    if ((await rememberMeCheckbox.isChecked()) !== rememberMe) {
      if (rememberMe) {
        await rememberMeCheckbox.check()
      } else {
        await rememberMeCheckbox.uncheck()
      }
    }

    await this.page.getByRole('button', { name: 'Sign in' }).click()
  }
}
