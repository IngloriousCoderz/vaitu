// Pushes in a browser, inside the service worker vite-plugin-pwa generates
// (vite.config.js imports this file into it). They come from Firebase Cloud
// Messaging as plain Web Push, so Firebase's own worker is not needed:
// push-notify sends each message fully worded in its data, and all that
// happens here is showing it, and opening its screen on a tap.

self.addEventListener("push", (event) => {
  const { title, body, url } = event.data.json().data
  event.waitUntil(
    // The icon pwa-assets.config.js generates from the logo. No badge: it
    // needs a one-colour shape, and the logo is not one.
    self.registration.showNotification(title, {
      body,
      icon: "/pwa-192x192.png",
      data: { url },
    }),
  )
})

// The app's window if it is open, a new one if not, on the message's screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = new URL(event.notification.data.url, self.location.origin).href
  event.waitUntil(open(url))
})

async function open(url) {
  const [client] = await self.clients.matchAll({ type: "window" })
  if (!client) return self.clients.openWindow(url)
  await client.focus()
  if (client.url !== url) await client.navigate(url)
}
