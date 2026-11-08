// A focused, visible Vaitu shows the news as a toast. Safari revokes a push
// subscription that skips notifications, so it always gets one.
const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

self.addEventListener("push", (event) => {
  const { title, body, url } = event.data.json().data
  event.waitUntil(notify(title, body, url))
})

async function notify(title, body, url) {
  if (!IS_SAFARI && (await isAppInFront())) return
  await self.registration.showNotification(title, {
    body,
    icon: "/pwa-192x192.png",
    data: { url },
  })
}

async function isAppInFront() {
  const windows = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  return windows.some(
    (client) => client.focused && client.visibilityState === "visible",
  )
}

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
