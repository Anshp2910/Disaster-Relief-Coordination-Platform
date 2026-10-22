import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'fs'

const BASE = 'http://localhost:5174'
const API = 'http://localhost:5002'
const OUT = 'design-plans/screens'
fs.mkdirSync(OUT, { recursive: true })

const admin = { email: 'admin@audit.com', password: 'auditpass123' }

const PAGES = [
  { path: '/login', name: 'login', auth: false },
  { path: '/register', name: 'register', auth: false },
  { path: '/forgot-password', name: 'forgot-password', auth: false },
  { path: '/reset-password', name: 'reset-password', auth: false },
  { path: '/public', name: 'public', auth: false },
  { path: '/dashboard', name: 'dashboard', auth: true },
  { path: '/map', name: 'map', auth: true },
  { path: '/profile', name: 'profile', auth: true },
  { path: '/resources', name: 'resources', auth: true },
  { path: '/zones', name: 'zones', auth: true },
  { path: '/requests/new', name: 'requests-new', auth: true },
  { path: '/requests/__ID__', name: 'request-detail', auth: true, needId: true },
  { path: '/incidents', name: 'incidents', auth: true },
  { path: '/schedules', name: 'schedules', auth: true },
  { path: '/geofencing', name: 'geofencing', auth: true },
  { path: '/admin', name: 'admin', auth: true },
  { path: '/bulk', name: 'bulk', auth: true },
  { path: '/escalation', name: 'escalation', auth: true },
  { path: '/this-page-does-not-exist', name: 'notfound', auth: true },
]

async function login(browser) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(admin),
  })
  if (!res.ok) throw new Error('login failed: ' + (await res.text()))
  const data = await res.json()
  return { token: data.token, user: data.user }
}

async function getRequestId(token) {
  const res = await fetch(`${API}/api/requests?limit=1`, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json()
  return data?.requests?.[0]?._id || data?.data?.[0]?._id || null
}

const results = []

async function auditPage(page, path, name, theme, viewport) {
  const consoleErrors = []
  const consoleWarnings = []
  const failedRequests = []
  const pageErrors = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
    if (msg.type() === 'warning') consoleWarnings.push(msg.text())
  })
  page.on('pageerror', (err) => pageErrors.push(String(err)))
  page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} ${req.failure()?.errorText || ''}`))

  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 })
  } catch (e) {
    results.push({ page: name, theme, viewport, error: 'NAV_FAIL: ' + e.message })
    return
  }
  await page.waitForTimeout(1200) // let animations/socket settle

  // network 4xx/5xx from API
  const apiResponses = []
  const netListener = (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      apiResponses.push(`${res.status()} ${res.url().replace(API, '')}`)
    }
  }
  page.on('response', netListener)

  let axe = { violations: [], passes: 0 }
  try {
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    axe = { violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })), passes: r.passes.length }
  } catch (e) {
    axe = { violations: [{ id: 'AXE_ERROR', impact: 'unknown', nodes: 0, help: String(e) }], passes: 0 }
  }
  page.off('response', netListener)

  await page.screenshot({ path: `${OUT}/${name}-${theme}-${viewport}.png`, fullPage: true })

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400))
  results.push({
    page: name,
    theme,
    viewport,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 6),
    consoleWarnings: [...new Set(consoleWarnings)].slice(0, 6),
    pageErrors: [...new Set(pageErrors)].slice(0, 3),
    failedRequests: [...new Set(failedRequests)].slice(0, 6),
    api4xx: [...new Set(apiResponses)].slice(0, 8),
    axeSerious: axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    axeTotal: axe.violations.length,
    axeIds: [...new Set(axe.violations.map((v) => v.id))].slice(0, 10),
    bodyPreview: bodyText.replace(/\s+/g, ' ').trim().slice(0, 160),
  })
}

const browser = await chromium.launch()
const { token, user } = await login(browser)
let requestId = null
try { requestId = await getRequestId(token) } catch {}

for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await ctx.addInitScript(
    ([t, tok, usr]) => {
      localStorage.setItem('theme', t)
      if (tok) localStorage.setItem('token', tok)
      if (usr) localStorage.setItem('user', JSON.stringify(usr))
    },
    [theme, token, user],
  )
  const page = await ctx.newPage()
  for (const p of PAGES) {
    if (p.auth && !token) continue
    const path = p.path.replace('__ID__', requestId || '000000000000000000000000')
    await auditPage(page, path, p.name, theme, 'desktop')
  }
  await ctx.close()
}

// Mobile spot-checks (dark theme, default)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })
  await ctx.addInitScript(
    ([tok, usr]) => {
      localStorage.setItem('theme', 'dark')
      if (tok) localStorage.setItem('token', tok)
      if (usr) localStorage.setItem('user', JSON.stringify(usr))
    },
    [token, user],
  )
  const page = await ctx.newPage()
  for (const p of ['/dashboard', '/resources', '/map', '/admin']) {
    await auditPage(page, p, 'mobile-' + p.slice(1), 'dark', 'mobile')
  }
  await ctx.close()
}

await browser.close()

// Summary
const byTheme = {}
for (const r of results) {
  byTheme[r.page + r.theme + r.viewport] = r
}
console.log('\n========== AUDIT SUMMARY ==========')
for (const r of results) {
  const errs = r.consoleErrors.length + r.pageErrors.length
  const flag = r.error ? '❌ NAV' : errs > 0 || r.axeSerious.length > 0 ? '⚠️ ' : '✅'
  console.log(
    `${flag} ${r.page.padEnd(18)} [${r.theme}/${r.viewport}] axe:${r.axeTotal} (serious:${r.axeSerious.length}) consoleErr:${r.consoleErrors.length} pageErr:${r.pageErrors.length} api4xx:${r.api4xx.length} ${r.error || ''}`,
  )
  if (r.axeSerious.length) {
    for (const v of r.axeSerious.slice(0, 4)) console.log(`      axe ${v.impact}: ${v.id} (${v.nodes} nodes)`)
  }
  for (const e of r.consoleErrors.slice(0, 2)) console.log(`      console: ${e.slice(0, 150)}`)
}

// Persistent JSON for detailed review
fs.writeFileSync('design-plans/audit-results.json', JSON.stringify(results, null, 2))
console.log('\nDetailed results written to design-plans/audit-results.json')
