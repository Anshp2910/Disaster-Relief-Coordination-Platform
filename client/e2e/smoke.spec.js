import { test, expect } from '@playwright/test'

test('app loads and shows login page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h2')).toContainText(/login|sign in/i)
})

test('navigates to public status page', async ({ page }) => {
  await page.goto('/#/public')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h2')).toContainText(/public|status|overview/i)
})

test('has skip-to-content link', async ({ page }) => {
  await page.goto('/')
  const skipLink = page.locator('a:has-text("Skip")')
  await expect(skipLink).toHaveCount(1)
})

test('dashboard requires auth and redirects to login', async ({ page }) => {
  await page.goto('/#/dashboard')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveURL(/login/)
})
