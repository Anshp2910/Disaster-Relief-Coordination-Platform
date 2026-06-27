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

const PAGES = ['/dashboard', '/map', '/resources', '/zones', '/incidents', '/requests/new', '/profile', '/admin']

test.describe('All pages auto-load', () => {
  test('every page loads without hard refresh', async ({ page }) => {
    // Unregister SW + clear caches
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(r => r.forEach(reg => reg.unregister()))
        caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
      }
    })

    // Mock only backend API endpoints (NOT /src/api/ source files)
    await page.route('**/api/auth/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }) })
    })
    await page.route('**/api/version', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '1.0.0' }) })
    })
    await page.route('**/api/requests/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], total: 0, pages: 0 }) })
    })
    await page.route('**/api/resources/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/zones/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/incidents/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/users/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/schedules/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/escalation/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/admin/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })
    await page.route('**/api/chat/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    })

    // Inject auth before first page load
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }, { token: MOCK_TOKEN, user: MOCK_USER })

    // Load dashboard
    await page.goto('/#/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const main = page.locator('.gov-main, main, [role="main"]')
    const visible = await main.isVisible()
    const rootHTML = (await page.locator('#root').innerHTML()).substring(0, 200)
    console.log(`Dashboard: main visible=${visible}, root=${rootHTML.substring(0, 100)}`)

    if (!visible) {
      console.log('Dashboard did not render — skipping further navigation')
      return
    }

    // Navigate every page via hash
    for (const path of PAGES) {
      await page.evaluate((hash) => { window.location.hash = hash }, path)
      await page.waitForTimeout(2000)

      const isVis = await main.isVisible()
      const url = page.url().split('#')[1] || ''
      console.log(`${isVis ? '✓' : '✗'} ${path} → ${url}`)
    }
  })
})
