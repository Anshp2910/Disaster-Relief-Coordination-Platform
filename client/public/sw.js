const CACHE_VERSION = 'v11'
const STATIC_CACHE = `disaster-relief-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `disaster-relief-dynamic-${CACHE_VERSION}`
const API_CACHE = `disaster-relief-api-${CACHE_VERSION}`
const MAX_DYNAMIC_CACHE = 50
const MAX_API_CACHE = 30
const FETCH_TIMEOUT = 10000

self.addEventListener('install', () => {})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)))
    }).then(() => {
      clients.matchAll({ type: 'window' }).then((windowClients) => {
        windowClients.forEach((client) => client.postMessage({ type: 'CACHE_CLEARED' }))
      })
    })
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE, MAX_API_CACHE))
    return
  }

  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE))
    return
  }

  if (url.pathname.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|gif|webp)$/)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE))
})

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

function cacheFirstStrategy(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) return cached
    return fetchWithTimeout(request, FETCH_TIMEOUT)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(cacheName).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
  })
}

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
