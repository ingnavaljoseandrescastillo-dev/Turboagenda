const CACHE_NAME = 'turboagenda-static-v1'
const STATIC_ASSET_PATTERN = /\.(?:css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (STATIC_ASSET_PATTERN.test(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {}
  const title = data.title || 'TurboAgenda'
  const options = {
    body: data.body || 'Tens uma nova notificacao.',
    icon: data.icon || '/pwa-icon-192.png',
    badge: data.badge || '/pwa-icon-192.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const matchingClient = clients.find((client) => client.url.includes(url))
        if (matchingClient) return matchingClient.focus()
        return self.clients.openWindow(url)
      })
  )
})

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)

  return cached || network
}
