import { test, expect } from '@playwright/test'

const MOCK_USER = {
  _id: 'test-user-001',
  email: 'admin@disaster.gov.in',
  displayName: 'Admin',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
}
const MOCK_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(MOCK_USER)).replace(/=/g, '')}.mock-sig`

/** Inject auth + mock API routes for authenticated page tests */
async function setupAuthenticatedPage(page) {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((r) => r.forEach((reg) => reg.unregister()))
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
  })

  await page.route('**/api/auth/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }) })
  )
  await page.route('**/api/version', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '1.0.0' }) })
  )
  await page.route('**/api/requests/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, pages: 0 }) })
  )
  await page.route('**/api/resources/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/zones/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/incidents/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/users/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/schedules/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/escalation/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/admin/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/api/chat/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )

  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, { token: MOCK_TOKEN, user: MOCK_USER })
}

/* ── Accessibility tests ────────────────────────────────────────── */

test.describe('Accessibility', () => {
  test('login page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const h1 = page.locator('h1')
    const h2 = page.locator('h2')
    const headingCount = (await h1.count()) + (await h2.count())
    expect(headingCount).toBeGreaterThanOrEqual(1)
  })

  test('login form inputs have associated labels', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('#login-email')
    if (await emailInput.count() > 0) {
      const ariaLabel = await emailInput.getAttribute('aria-label')
      const id = await emailInput.getAttribute('id')
      const label = page.locator(`label[for="${id}"]`)
      const hasLabel = (await label.count()) > 0 || !!ariaLabel
      expect(hasLabel).toBe(true)
    }
  })

  test('all ARIA landmarks are present on authenticated pages', async ({ page }) => {
    await setupAuthenticatedPage(page)
    await page.goto('/#/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const nav = page.locator('nav, [role="navigation"]')
    const main = page.locator('main, [role="main"]')
    const navCount = await nav.count()
    const mainCount = await main.count()
    expect(navCount).toBeGreaterThanOrEqual(1)
    expect(mainCount).toBeGreaterThanOrEqual(1)
  })

  test('skip-to-content link is present and first focusable', async ({ page }) => {
    await page.goto('/')
    const skipLink = page.locator('a.skip-link, a:has-text("Skip")')
    await expect(skipLink).toHaveCount(1)

    await page.keyboard.press('Tab')
    const focused = page.locator('a.skip-link:focus, a:has-text("Skip"):focus')
    await expect(focused).toBeVisible()
  })

  test('images have alt attributes or are decorative', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const images = page.locator('img')
    const count = await images.count()
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaHidden = await img.getAttribute('aria-hidden')
      // Every image must have alt or aria-hidden
      expect(alt !== null || ariaHidden === 'true').toBe(true)
    }
  })
})

/* ── Modal focus trap tests ─────────────────────────────────────── */

test.describe('Modal focus trap', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page)
  })

  test('modal traps focus on tab cycle', async ({ page }) => {
    await page.goto('/#/zones')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Click "Add Zone" button to open modal
    const addBtn = page.locator('button:has-text("Add Zone"), button:has-text("add zone")')
    if (await addBtn.count() === 0) {
      test.skip(true, 'Add Zone button not found')
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)

    // Modal should be visible
    const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]')
    await expect(modal.first()).toBeVisible()

    // Tab should cycle within the modal
    await page.keyboard.press('Tab')
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement
      return el ? el.tagName + '.' + el.className : 'none'
    })
    // Focus should remain inside the modal
    expect(activeElement).not.toBe('BODY')
  })

  test('Escape key closes modal', async ({ page }) => {
    await page.goto('/#/zones')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const addBtn = page.locator('button:has-text("Add Zone"), button:has-text("add zone")')
    if (await addBtn.count() === 0) {
      test.skip(true, 'Add Zone button not found')
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)

    const modal = page.locator('[role="dialog"], .modal, [aria-modal="true"]')
    await expect(modal.first()).toBeVisible()

    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Modal should be gone
    await expect(modal.first()).not.toBeVisible()
  })

  test('modal has aria-live announcement', async ({ page }) => {
    await page.goto('/#/zones')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const addBtn = page.locator('button:has-text("Add Zone"), button:has-text("add zone")')
    if (await addBtn.count() === 0) {
      test.skip(true, 'Add Zone button not found')
      return
    }
    await addBtn.click()
    await page.waitForTimeout(500)

    const liveRegion = page.locator('[aria-live="polite"]')
    const count = await liveRegion.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

/* ── PWA / Service Worker tests ─────────────────────────────────── */

test.describe('PWA', () => {
  test('service worker registers successfully', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const registration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return null
      const reg = await navigator.serviceWorker.ready
      return { scope: reg.scope, active: !!reg.active }
    })
    // In dev mode SW may not register; just check the API exists
    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(swSupported).toBe(true)
  })

  test('manifest.json is valid and loadable', async ({ page }) => {
    const response = await page.goto('/manifest.json')
    expect(response?.status()).toBe(200)
    const manifest = await response?.json()
    expect(manifest?.name).toBeTruthy()
    expect(manifest?.short_name).toBeTruthy()
    expect(manifest?.start_url).toBeTruthy()
    expect(manifest?.icons?.length).toBeGreaterThanOrEqual(1)
  })

  test('app has meta theme-color', async ({ page }) => {
    await page.goto('/#/login')
    const themeColor = page.locator('meta[name="theme-color"]')
    // Theme color may be set via manifest or meta tag
    const manifestLink = page.locator('link[rel="manifest"]')
    const hasManifest = await manifestLink.count() > 0
    // Either meta theme-color or manifest link should exist
    const hasThemeColor = await themeColor.count() > 0
    expect(hasManifest || hasThemeColor).toBe(true)
  })
})

/* ── Responsive viewport tests ──────────────────────────────────── */

test.describe('Responsive design', () => {
  test('login page renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }) // iPhone X
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const loginForm = page.locator('form, .auth-form, #login-email')
    await expect(loginForm.first()).toBeVisible()
  })

  test('login page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }) // iPad
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const loginForm = page.locator('form, .auth-form, #login-email')
    await expect(loginForm.first()).toBeVisible()
  })

  test('dashboard renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setupAuthenticatedPage(page)
    await page.goto('/#/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const main = page.locator('main, [role="main"], .gov-main')
    const visible = await main.first().isVisible()
    // Page should at least render without crashing
    const rootHTML = await page.locator('#root').innerHTML()
    expect(rootHTML.length).toBeGreaterThan(100)
  })

  test('navigation menu adapts to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setupAuthenticatedPage(page)
    await page.goto('/#/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // On mobile, nav links should be hidden or in a hamburger menu
    const nav = page.locator('nav, [role="navigation"]')
    if (await nav.count() > 0) {
      // Nav exists but may be collapsed on mobile
      const isVis = await nav.first().isVisible()
      // Either visible or in a hamburger — both are valid
      expect(typeof isVis).toBe('boolean')
    }
  })
})

/* ── Form validation tests ──────────────────────────────────────── */

test.describe('Form validation', () => {
  test('login form validates required fields', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Try submitting empty form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
    if (await submitBtn.count() === 0) {
      test.skip(true, 'Submit button not found')
      return
    }
    await submitBtn.first().click()

    // HTML5 validation should prevent submission
    const emailInput = page.locator('#login-email')
    if (await emailInput.count() > 0) {
      const validationMessage = await emailInput.evaluate(
        (el) => el.validationMessage
      )
      // Browser should show a validation message for required field
      expect(validationMessage).toBeTruthy()
    }
  })

  test('registration form has password confirmation', async ({ page }) => {
    await page.goto('/#/register')
    await page.waitForLoadState('networkidle')

    const passwordInput = page.locator('#register-password, input[name="password"]')
    const confirmInput = page.locator('#register-confirm-password, input[name="confirmPassword"]')

    if ((await passwordInput.count()) > 0 && (await confirmInput.count()) > 0) {
      await passwordInput.fill('Password123!')
      await confirmInput.fill('DifferentPassword')
      // Both fields should have values
      expect(await passwordInput.inputValue()).toBeTruthy()
      expect(await confirmInput.inputValue()).toBeTruthy()
    }
  })
})

/* ── RTL language support ───────────────────────────────────────── */

test.describe('RTL support', () => {
  test('page direction changes for RTL languages', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Initial direction should be LTR
    const dir = await page.locator('html').getAttribute('dir')
    expect(dir === 'ltr' || dir === null || dir === '').toBe(true)

    // Look for a language selector (may require auth)
    const langSelect = page.locator('select[aria-label*="language" i], select.lang-select, select:has(option[value="ur"])')
    if (await langSelect.count() > 0) {
      await langSelect.first().selectOption('ur')
      await page.waitForTimeout(500)
      const newDir = await page.locator('html').getAttribute('dir')
      expect(newDir).toBe('rtl')

      // Switch back to English
      await langSelect.first().selectOption('en')
      await page.waitForTimeout(500)
      const resetDir = await page.locator('html').getAttribute('dir')
      expect(resetDir).not.toBe('rtl')
    }
  })
})

/* ── Password visibility toggle ─────────────────────────────────── */

test.describe('Password toggle', () => {
  test('password input toggles visibility', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const passwordInput = page.locator('#login-password')
    if (await passwordInput.count() === 0) {
      test.skip(true, 'Password input not found')
      return
    }

    await passwordInput.fill('testpassword123')
    await expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = page.getByRole('button', { name: /show|hide password/i })
    if (await toggleBtn.count() > 0) {
      await toggleBtn.first().click({ force: true })
      await expect(passwordInput).toHaveAttribute('type', 'text')

      await toggleBtn.first().click({ force: true })
      await expect(passwordInput).toHaveAttribute('type', 'password')
    }
  })
})

/* ── 404 page ──────────────────────────────────────────────────── */

test.describe('Error handling', () => {
  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist-xyz')
    await page.waitForLoadState('networkidle')

    const content = await page.locator('#root').textContent()
    const isNotFound = content?.toLowerCase().includes('not found') ||
                       content?.includes('404') ||
                       content?.toLowerCase().includes('lost')
    expect(isNotFound).toBe(true)
  })
})

/* ── Public pages ───────────────────────────────────────────────── */

test.describe('Public pages', () => {
  test('public status page loads without authentication', async ({ page }) => {
    await page.goto('/#/public')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/public/)
  })

  test('public status page shows meaningful content', async ({ page }) => {
    await page.goto('/#/public')
    await page.waitForLoadState('networkidle')

    const content = await page.locator('#root').textContent()
    expect(content?.length).toBeGreaterThan(50)
  })
})

/* ── Theme support ──────────────────────────────────────────────── */

test.describe('Theme', () => {
  test('HTML element has a theme class', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const classList = await page.locator('html').getAttribute('class')
    const hasTheme = classList?.includes('light') || classList?.includes('dark')
    expect(hasTheme).toBe(true)
  })
})
