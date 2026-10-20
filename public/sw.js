/* Offline support: app shell is cached on install; other same-origin assets and fonts are cached as they are used. */
const CACHE = 'callbreak-v2'
const scope = self.registration.scope
const SHELL = ['', 'index.html', 'manifest.webmanifest', 'icon.svg'].map((p) => new URL(p, scope).href)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const cacheable =
    url.origin === self.location.origin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  if (!cacheable) return

  // Pages: network first so updates arrive, falling back to the cached shell offline.
  // Every page is the same app (it reads the URL itself), so a deep link like
  // /online/callbreak/ABCDE that the host answers with a 404 also gets the app shell.
  if (request.mode === 'navigate') {
    const shell = new URL('index.html', scope).href
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.status === 404) return caches.match(shell).then((cached) => cached || res)
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(shell, copy))
          }
          return res
        })
        .catch(() => caches.match(shell))
    )
    return
  }

  // Everything else: serve from cache immediately, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
