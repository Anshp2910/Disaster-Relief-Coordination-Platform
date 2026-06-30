const CACHE_VERSION = 'v13'
const STATIC_CACHE = `disaster-relief-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `disaster-relief-dynamic-${CACHE_VERSION}`
const API_CACHE = `disaster-relief-api-${CACHE_VERSION}`
const OFFLINE_QUEUE = 'disaster-relief-offline-queue'
const MAX_STATIC_CACHE = 100
const MAX_DYNAMIC_CACHE = 50
const MAX_API_CACHE = 30
const FETCH_TIMEOUT = 10000

/* ── App shell assets to precache on install ───────────────────── */
const APP_SHELL = [
  '/',
  '/index.html',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.json',
  '/theme-init.js',
  '/robots.txt',
  '/sitemap.xml',
]

/* ── Install: precache app shell ────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

/* ── Message handler ────────────────────────────────────────────── */
self.addEventListener('message', (event) => {
  const { data } = event
  if (!data) return

  switch (data.type) {
    case 'CLEAR_CACHE':
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => caches.delete(k)))
      ).then(() => {
        clients.matchAll({ type: 'window' }).then((windowClients) => {
          windowClients.forEach((client) => client.postMessage({ type: 'CACHE_CLEARED' }))
        })
      })
      break

    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'QUEUE_OFFLINE_REQUEST': {
      // Store failed POST/PUT/DELETE for background replay
      const payload = data.payload || {}
      event.waitUntil(
        caches.open(OFFLINE_QUEUE).then((cache) => {
          const meta = {
            url: payload.url || '',
            method: payload.method || 'POST',
            body: payload.body || null,
            headers: payload.headers || { 'Content-Type': 'application/json' },
          }
          const key = `offline-${Date.now()}-${Math.random()}`
          return cache.put(
            new Request(key),
            new Response(JSON.stringify(meta), { status: 503 })
          )
        })
      )
      break
    }

    case 'REPLAY_OFFLINE_QUEUE':
      event.waitUntil(replayOfflineQueue())
      break
  }
})

/* ── Activate: clean old caches, notify clients ─────────────────── */
self.addEventListener('activate', (event) => {
  const validCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, OFFLINE_QUEUE])
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
     .then(() => self.clients.matchAll({ type: 'window' }))
     .then((windowClients) => {
       windowClients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION }))
     })
  )
})

/* ── Fetch: routing strategies ──────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin and non-GET
  if (url.origin !== self.location.origin) return

  // Navigation requests (SPA) — network-first with offline fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request))
    return
  }

  // API requests — network-first with stale-while-revalidate for GET, queue for POST/PUT/DELETE
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(networkFirstStrategy(request, API_CACHE, MAX_API_CACHE))
    } else {
      event.respondWith(mutatingRequestStrategy(request))
    }
    return
  }

  // Uploads — cache-first
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE))
    return
  }

  // Static assets — cache-first with network fallback
  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|gif|webp|ico)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE, MAX_STATIC_CACHE))
    return
  }

  // Everything else — network-first
  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE))
})

/* ── Strategies ─────────────────────────────────────────────────── */

/**
 * SPA navigation: try network, fall back to cached index.html.
 * This ensures all hash routes work offline after first visit.
 */
function navigationStrategy(request) {
  return fetchWithTimeout(request, FETCH_TIMEOUT)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone))
      }
      return response
    })
    .catch(() => caches.match('/index.html'))
}

/**
 * POST/PUT/DELETE: try network, queue for background replay on failure.
 */
function mutatingRequestStrategy(request) {
  return fetchWithTimeout(request, FETCH_TIMEOUT)
    .then((response) => {
      // On success, notify clients to replay any queued requests
      if (response && response.ok) {
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: 'REPLAY_OFFLINE_QUEUE' }))
        })
      }
      return response
    })
    .catch(() => {
      // Queue for background sync
      return caches.open(OFFLINE_QUEUE).then((cache) => {
        const clone = request.clone()
        return cache.put(clone, new Response('queued', { status: 503 }))
      }).then(() => new Response(
        JSON.stringify({ error: 'offline', message: 'Request queued for sync' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    })
}

/* ── Shared utilities ───────────────────────────────────────────── */

function fetchWithTimeout(request, timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timeoutId))
}

function limitCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCache(cacheName, maxItems))
      }
    })
  })
}

function networkFirstStrategy(request, cacheName, maxItems) {
  return fetchWithTimeout(request, FETCH_TIMEOUT)
    .then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => {
          cache.put(request, clone)
          if (maxItems) limitCache(cacheName, maxItems)
        })
      }
      return response
    })
    .catch(() => caches.match(request))
}

function cacheFirstStrategy(request, cacheName, maxItems) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetchWithTimeout(request, FETCH_TIMEOUT)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(cacheName).then((cache) => {
            cache.put(request, clone)
            if (maxItems) limitCache(cacheName, maxItems)
          })
        }
        return response
      })
      .catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
  })
}

/* ── Background replay of queued offline requests ───────────────── */
async function replayOfflineQueue() {
  const cache = await caches.open(OFFLINE_QUEUE)
  const keys = await cache.keys()
  for (const req of keys) {
    try {
      const cachedRes = await cache.match(req)
      if (!cachedRes) continue

      const meta = await cachedRes.json()
      if (!meta.url) { await cache.delete(req); continue }

      const replayReq = new Request(meta.url, {
        method: meta.method || 'POST',
        headers: meta.headers || { 'Content-Type': 'application/json' },
        body: meta.body || undefined,
      })
      const response = await fetch(replayReq)
      if (response.ok) {
        await cache.delete(req)
      }
    } catch {
      // Will retry on next sync
    }
  }
}

/* ── Push notifications ─────────────────────────────────────────── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'Disaster Relief', body: 'New update available' }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [200, 100, 200],
      data: data.url || '/dashboard',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(event.notification.data)
          return
        }
      }
      self.clients.openWindow(event.notification.data)
    })
  )
})
