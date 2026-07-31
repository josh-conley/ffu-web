/**
 * Kill switch for the OLD site's service worker.
 *
 * The previous site (`ffu-app`) shipped `vite-plugin-pwa` with `registerType: 'autoUpdate'`, which
 * registered a service worker at this exact URL (`/sw.js`, scope `/`) with workbox's default
 * `navigateFallback: index.html`. That worker is still installed in the browser of anyone who
 * visited ffunion.com before the apex cutover, and it answers EVERY navigation on this origin from
 * its own precache — so those visitors keep getting the old HashRouter app (and its `#/route` URLs)
 * no matter what GitHub Pages now serves. Reported 2026-07-31: a deep link to /lineal rendered the
 * old site, with the address bar showing `ffunion.com/lineal#/members`.
 *
 * This file replaces that worker with one that deletes every cache, unregisters itself, and reloads
 * open tabs onto the real site. This repo never registers a service worker, so for everyone else
 * the file is inert — it only runs for browsers that still hold the old registration and fetch it
 * during their update check.
 *
 * Deliberately NO `fetch` handler: with none registered, navigations go straight to the network.
 *
 * Keep this file until the old registrations have aged out (they self-heal on any visit). Removing
 * it early just returns /sw.js to a 404, which is a slower, less reliable path to the same result.
 */
self.addEventListener('install', () => {
  // Take over from the old worker immediately rather than waiting for every tab to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.registration.unregister()

      // Reload any open tab — they're currently showing the old cached app.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        client.navigate(client.url)
      }
    })(),
  )
})
