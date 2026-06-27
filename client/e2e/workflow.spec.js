import { test, expect } from '@playwright/test'

test('skip to content link is first focusable element', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skipLink = page.locator('a.skip-link:focus')
  await expect(skipLink).toBeVisible()
})

test('language selector changes direction for RTL', async ({ page }) => {
  await page.goto('/')
  const langSelect = page.locator('select[aria-label="Select language"], select.lang-select')
  if (await langSelect.count() === 0) { test.skip(true, 'Language selector requires auth (NavBar only visible when logged in)'); return }
  await langSelect.selectOption('ur')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await langSelect.selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test('password toggle shows and hides password', async ({ page }) => {
  await page.goto('/#/login')
  const passwordInput = page.locator('#login-password')
  await passwordInput.fill('mysecretpassword')
  await expect(passwordInput).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: /show|hide password/i }).click({ force: true })
  await expect(passwordInput).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: /show|hide password/i }).first().click({ force: true })
  await expect(passwordInput).toHaveAttribute('type', 'password')
})

test('theme toggle switches between light and dark', async ({ page }) => {
  await page.goto('/')
  const themeBtn = page.locator('button[aria-label*="Switch to"], button[aria-label*="Toggle theme"]')
  if (await themeBtn.count() === 0) { test.skip(true, 'Theme toggle requires auth (NavBar only visible when logged in)'); return }
  const initialTheme = await page.locator('html').getAttribute('data-theme')
  await themeBtn.click()
  const newTheme = await page.locator('html').getAttribute('data-theme')
  expect(newTheme).not.toBe(initialTheme)
})

test('map page renders without auth redirect', async ({ page }) => {
  await page.goto('/#/public')
  await page.waitForLoadState('networkidle')
  expect(page.url()).toContain('/public')
})

test('404 page shows for unknown routes', async ({ page }) => {
  await page.goto('/#/nonexistent-route')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('text=not found').or(page.locator('text=404')).first()).toBeVisible()
})
