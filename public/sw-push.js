/* Classic service worker module imported by the generated Workbox SW
   (vite.config.js: workbox.importScripts = ["sw-push.js"]).
   Handles the two Web Push events: push and notificationclick.
   No caching, no precaching — the generated SW owns that. */

// The push payload is { title, body, url } assembled by the edge function.
// The SW only shows it — no i18n, no routing logic here.
self.addEventListener("push", (event) => {
  if (!event.data) return
  const { title, body, url } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo-192.png",
      badge: "/logo-192.png",
      data: { url },
      requireInteraction: false,
    }),
  )
})

// Clicking the toast opens/focuses the target URL in the existing client
// if one is open, otherwise opens a new window.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url === url && "focus" in client) return client.focus()
        }
        return self.clients.openWindow(url)
      }),
  )
})
