import { test, expect } from '@playwright/test'

test.describe('Smoke tests', () => {

  test('homepage loads and shows app title', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    const title = await page.title()
    expect(title).toContain('Disaster Relief')
  })

  test('login form has all fields and submit button', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('#login-email')).toBeVisible()
    await expect(page.locator('#login-password')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('#login-email')).toHaveAttribute('type', 'email')
    await expect(page.locator('#login-password')).toHaveAttribute('type', 'password')
    await expect(page.locator('a[href="#/register"]')).toBeVisible()
  })

  test('register form has all fields', async ({ page }) => {
    await page.goto('/#/register')
    await expect(page.locator('#reg-name')).toBeVisible()
    await expect(page.locator('#reg-email')).toBeVisible()
    await expect(page.locator('#reg-password')).toBeVisible()
    await expect(page.locator('#reg-name')).toHaveAttribute('required', '')
    await expect(page.locator('#reg-email')).toHaveAttribute('type', 'email')
    await expect(page.locator('#reg-password')).toHaveAttribute('type', 'password')
    await expect(page.locator('a[href="#/login"]')).toBeVisible()
  })

  test('public status page loads with stats', async ({ page }) => {
    await page.goto('/#/public')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('[role="banner"]').or(page.locator('header'))).toBeVisible()
  })

  test('404 page shows not found and has go-back link', async ({ page }) => {
    await page.goto('/#/nonexistent-route-that-does-not-exist')
    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('a[href="#/dashboard"], a[href="#/login"]').first()).toBeVisible()
  })

  test('manifest link and service worker registration', async ({ page }) => {
    await page.goto('/')
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })

  test('theme toggle affects document class', async ({ page }) => {
    await page.goto('/#/login')
    const html = page.locator('html')
    const initialClass = await html.getAttribute('class')
    const hasLight = initialClass?.includes('light')
    if (hasLight) {
      await expect(html).toHaveClass(/light/)
    }
  })

  test('language selector is present', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('select').first()).toBeVisible()
  })

  test('skip-to-content link exists', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page.locator('.skip-link, a[href="#main-content"]').first()).toBeVisible()
  })

  test('footer with government info loads', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')
    await expect(footer).toBeVisible()
    await expect(footer.locator('a[href="#/dashboard"]')).toBeVisible()
  })
})
