import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {

  test('homepage loads and redirects to login', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('login form is accessible', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('register form is accessible', async ({ page }) => {
    await page.goto('/#/register')
    await expect(page.locator('#reg-name')).toBeVisible()
    await expect(page.locator('#reg-email')).toBeVisible()
    await expect(page.locator('#reg-password')).toBeVisible()
  })

  test('public status page loads', async ({ page }) => {
    await page.goto('/#/public')
    await expect(page.locator('body')).toBeVisible()
  })

  test('404 page shows not found', async ({ page }) => {
    await page.goto('/#/nonexistent-route-that-does-not-exist')
    await expect(page.locator('body')).toBeVisible()
  })

  test('has valid page title', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title).toContain('Disaster Relief')
  })

  test('manifest link exists', async ({ page }) => {
    await page.goto('/')
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })
})
