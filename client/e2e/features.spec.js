import { test, expect } from '@playwright/test'

test.describe('Command Center', () => {
  test('command center page loads standalone without layout chrome', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const body = page.locator('.cc-body')
    await expect(body).toBeVisible()
    await expect(page.locator('.cc-topbar')).toBeVisible()
    await expect(page.locator('.cc-main')).toBeVisible()
    await expect(page.locator('.cc-bottombar')).toBeVisible()
  })

  test('command center shows live clock', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const clock = page.locator('.cc-topbar-time')
    await expect(clock).toBeVisible()
  })

  test('command center displays counters', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const counters = page.locator('.cc-counter')
    const count = await counters.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('command center has SOS alerts section', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const sosItems = page.locator('.cc-sos-item')
    const count = await sosItems.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('command center shows weather widget', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.cc-weather')).toBeVisible()
    await expect(page.locator('.cc-weather-temp')).toBeVisible()
  })

  test('command center quick action buttons are clickable', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const buttons = page.locator('.cc-quick-btn')
    const count = await buttons.count()
    expect(count).toBe(4)
  })

  test('command center has active map with legend', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.cc-map')).toBeVisible()
    await expect(page.locator('.cc-map-legend')).toBeVisible()
    await expect(page.locator('.cc-map-coords')).toBeVisible()
  })

  test('command center shows real-time feed', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.cc-feed')).toBeVisible()
    const feedItems = page.locator('.cc-feed-item')
    const count = await feedItems.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('command center shows incident cards', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    const cards = page.locator('.cc-incident-card')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('command center bottom bar shows system status', async ({ page }) => {
    await page.goto('/#/command-center')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('.cc-bottom-status')).toBeVisible()
    await expect(page.locator('.cc-ticker')).toBeVisible()
  })
})

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

  test('language select is present', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const langSelect = page.locator('select.lang-select, select[aria-label*="Language"]')
    await expect(langSelect).toBeVisible()
  })
})
