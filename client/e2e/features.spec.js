import { test, expect } from '@playwright/test'

test.describe('Admin Charts', () => {
  test('admin dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/admin')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/login/)
  })
})

test.describe('i18n', () => {
  test('login page shows translated title', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2')).toBeVisible()
  })

  test.skip('language select is present on authenticated pages', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const langSelect = page.locator('select.gov-navbar-lang-select')
    await expect(langSelect).toBeVisible()
  })
})
