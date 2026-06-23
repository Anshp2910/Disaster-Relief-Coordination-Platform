const CACHE_VERSION = 'v6'
const STATIC_CACHE = `disaster-relief-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `disaster-relief-dynamic-${CACHE_VERSION}`
const API_CACHE = `disaster-relief-api-${CACHE_VERSION}`
const MAX_DYNAMIC_CACHE = 50
const MAX_API_CACHE = 30

self.addEventListener('install', (event) => {
  self.skipWaiting()
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
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

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

  if (request.mode === 'navigate') {
    event.respondWith(networkOnlyForHtml(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE))
})

function limitCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCache(cacheName, maxItems))
      }
    })
  })
}

function networkOnlyForHtml(request) {
  return fetch(request).then((response) => {
    if (response && response.status === 200) {
      const clone = response.clone()
      caches.open(STATIC_CACHE).then((cache) => {
        cache.put(request, clone)
      })
    }
    return response
  }).catch(() => caches.match(request))
}

function networkFirstStrategy(request, cacheName, maxItems) {
  return fetch(request)
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
    return fetch(request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, clone))
      }
      return response
    })
  })
}

function staleWhileRevalidate(request, cacheName) {
  return caches.match(request).then((cached) => {
    const fetched = fetch(request).then((response) => {
      if (response && response.status === 200) {
        const clone = response.clone()
        caches.open(cacheName).then((cache) => cache.put(request, clone))
      }
      return response
    })
    return cached || fetched
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
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
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
