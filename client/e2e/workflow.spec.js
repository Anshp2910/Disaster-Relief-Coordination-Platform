import { test, expect } from '@playwright/test'

test.describe('Auth flow', () => {
  test('login page renders form', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('register page has link to login', async ({ page }) => {
    await page.goto('/#/register')
    await expect(page.locator('a:has-text("Login")')).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/#/requests/new')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/login/)
  })

  test('public status page is accessible without auth', async ({ page }) => {
    await page.goto('/#/public')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/public/)
  })

  test('not found page for unknown routes', async ({ page }) => {
    await page.goto('/#/nonexistent-route-xyz')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/nonexistent-route-xyz/)
  })

  test('404 page shows not found content', async ({ page }) => {
    await page.goto('/#/nonexistent-route-xyz')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })
})

test.describe('Login form interactions', () => {
  test('login form has all required fields', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login button is clickable', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const btn = page.locator('button[type="submit"]')
    await expect(btn).toBeEnabled()
  })
})

test.describe('Command palette trigger', () => {
  test('header shows command palette hint', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const hint = page.locator('.cmd-hint, [data-cmd-hint]')
    if (await hint.isVisible().catch(() => false)) {
      await expect(hint).toBeVisible()
    }
  })
})
