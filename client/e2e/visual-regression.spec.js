import { test, expect } from '@playwright/test'

/* ── Shared constants ──────────────────────────────────────────── */

const MOCK_USER = {
  _id: 'test-user-001',
  email: 'admin@disaster.gov.in',
  displayName: 'Admin',
  role: 'admin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400,
}
const MOCK_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(MOCK_USER)).replace(/=/g, '')}.mock-sig`

const BREAKPOINTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
]

const AUTH_PAGES = ['/dashboard', '/map', '/resources', '/zones', '/incidents', '/admin']
const PUBLIC_PAGES = ['/login', '/register', '/public']

/** Sample data for realistic-looking dashboard/reports */
const SAMPLE_DATA = {
  requests: [
    { _id: 'r1', title: 'Flood relief supplies', status: 'in-progress', priority: 'critical', locationName: 'Mumbai', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'r2', title: 'Medical aid needed', status: 'pending', priority: 'high', locationName: 'Delhi', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'r3', title: 'Evacuation assistance', status: 'resolved', priority: 'urgent', locationName: 'Chennai', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { _id: 'r4', title: 'Food distribution', status: 'in-progress', priority: 'medium', locationName: 'Kolkata', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  zones: [
    { _id: 'z1', name: 'Zone A - Coastal', risk: 'high', coverageStatus: 'covered', lat: 19.076, lng: 72.877 },
    { _id: 'z2', name: 'Zone B - Inland', risk: 'medium', coverageStatus: 'partial', lat: 28.704, lng: 77.102 },
    { _id: 'z3', name: 'Zone C - Mountain', risk: 'low', coverageStatus: 'uncovered', lat: 13.083, lng: 80.270 },
  ],
  resources: [
    { _id: 'res1', name: 'Emergency Shelter Kit', quantity: 150, unit: 'kits', status: 'available', location: 'Mumbai Hub' },
    { _id: 'res2', name: 'Water Purification Tablets', quantity: 500, unit: 'boxes', status: 'available', location: 'Delhi Hub' },
    { _id: 'res3', name: 'First Aid Kits', quantity: 75, unit: 'kits', status: 'low', location: 'Chennai Hub' },
  ],
  incidents: [
    { _id: 'i1', title: 'Flash Flood Warning', status: 'active', severity: 'critical', location: 'Mumbai Coastal', reportedAt: new Date().toISOString() },
    { _id: 'i2', title: 'Landslide Risk', status: 'monitoring', severity: 'high', location: 'Himalayan Foothills', reportedAt: new Date().toISOString() },
  ],
  stats: {
    totalRequests: 156,
    pendingRequests: 42,
    inProgressRequests: 38,
    resolvedRequests: 76,
    activeIncidents: 2,
    availableResources: 1200,
    zonesManaged: 8,
    activeUsers: 24,
  },
  schedules: [],
  escalation: [],
  chat: [],
  users: [MOCK_USER],
  admin: { stats: { users: 24, requests: 156, zones: 8, incidents: 2 } },
}

/* ── Helpers ────────────────────────────────────────────────────── */

/**
 * Mock all backend API routes with sample data so screenshots
 * are deterministic.
 */
async function mockApiRoutes(page) {
  await page.route('**/api/auth/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: MOCK_TOKEN, user: MOCK_USER }),
    }),
  )
  await page.route('**/api/version', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '1.0.0' }) }),
  )
  await page.route('**/api/requests/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: SAMPLE_DATA.requests, total: SAMPLE_DATA.requests.length, pages: 1 }),
    }),
  )
  await page.route('**/api/resources/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.resources) }),
  )
  await page.route('**/api/zones/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.zones) }),
  )
  await page.route('**/api/incidents/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.incidents) }),
  )
  await page.route('**/api/users/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.users) }),
  )
  await page.route('**/api/schedules/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.schedules) }),
  )
  await page.route('**/api/escalation/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.escalation) }),
  )
  await page.route('**/api/admin/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.admin) }),
  )
  await page.route('**/api/chat/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.chat) }),
  )

  await page.route('**/api/dashboard/stats', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_DATA.stats) }),
  )
}

/**
 * Inject auth into localStorage before navigation.
 */
async function injectAuth(page) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }, { token: MOCK_TOKEN, user: MOCK_USER })
}

/**
 * Disable CSS animations / transitions so screenshots are deterministic.
 */
async function freezeAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  })
}

/**
 * Navigate to a page and wait for it to settle.
 */
async function navigateAndSettle(page, hashPath) {
  await page.goto(`/#${hashPath}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500) // allow SPA routes + lazy loading
  await freezeAnimations(page)
  await page.waitForTimeout(300) // let freeze take effect
}

/**
 * Take a named screenshot at the current viewport.
 * fullPage captures the entire scrollable area.
 */
async function snap(page, name) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    maxDiffPixelRatio: 0.05, // 5% — accounts for font rendering & anti-aliasing differences
  })
}

/* ── Authenticated page setup ──────────────────────────────────── */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((r) => r.forEach((reg) => reg.unregister()))
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
    }
  })
})

/* ── Tests ─────────────────────────────────────────────────────── */

BREAKPOINTS.forEach((bp) => {
  test.describe(`@${bp.name} (${bp.width}×${bp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height })
      await mockApiRoutes(page)
    })

    /* Public pages */

    test(`login page — ${bp.name}`, async ({ page }) => {
      await navigateAndSettle(page, '/login')
      await snap(page, `login-${bp.name}`)
    })

    test(`register page — ${bp.name}`, async ({ page }) => {
      await navigateAndSettle(page, '/register')
      await snap(page, `register-${bp.name}`)
    })

    test(`public status page — ${bp.name}`, async ({ page }) => {
      await navigateAndSettle(page, '/public')
      await snap(page, `public-status-${bp.name}`)
    })

    /* Authenticated pages */

    AUTH_PAGES.forEach((path) => {
      const pageName = path.replace('/', '')

      test(`${pageName} page — ${bp.name}`, async ({ page }) => {
        await injectAuth(page)
        await navigateAndSettle(page, path)
        await snap(page, `${pageName}-${bp.name}`)
      })
    })
  })
})

/* ── Edge-case tests ───────────────────────────────────────────── */

test.describe('edge cases', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
    await injectAuth(page)
  })

  test('very narrow viewport (320px) — dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 }) // iPhone SE
    await navigateAndSettle(page, '/dashboard')
    await snap(page, 'dashboard-narrow')
  })

  test('mid-range viewport (1024px) — dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 }) // iPad landscape
    await navigateAndSettle(page, '/dashboard')
    await snap(page, 'dashboard-1024')
  })

  test('ultrawide viewport (1920px) — dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await navigateAndSettle(page, '/dashboard')
    await snap(page, 'dashboard-ultrawide')
  })

  test('long-content page (request detail) — phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await navigateAndSettle(page, '/requests/r1')
    await snap(page, 'request-detail-phone')
  })

  test('404 page — phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await navigateAndSettle(page, '/nonexistent-route')
    await snap(page, 'not-found-phone')
  })

  test('profile page — phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await navigateAndSettle(page, '/profile')
    await snap(page, 'profile-phone')
  })
})
