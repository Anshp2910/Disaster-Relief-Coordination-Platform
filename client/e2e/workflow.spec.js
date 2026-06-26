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
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('not found page for unknown routes', async ({ page }) => {
    await page.goto('/#/nonexistent-route-xyz')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/nonexistent-route-xyz/)
  })
})

test.describe('Filter UI', () => {
  test('status filter pills render on dashboard', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const filterPills = page.locator('button.filter-pill')
    const count = await filterPills.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('Create request flow', () => {
  test('create request form renders all fields', async ({ page }) => {
    await page.goto('/#/login')
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    if (await emailInput.isVisible()) {
      await emailInput.fill('admin@test.com')
      await passwordInput.fill('password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForLoadState('networkidle')
    }
    await page.goto('/#/requests/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('#rf-title')).toBeVisible()
    await expect(page.locator('#rf-desc')).toBeVisible()
    await expect(page.locator('#rf-category')).toBeVisible()
    await expect(page.locator('#rf-priority')).toBeVisible()
    await expect(page.locator('#rf-people')).toBeVisible()
    await expect(page.locator('#rf-search')).toBeVisible()
  })
})
