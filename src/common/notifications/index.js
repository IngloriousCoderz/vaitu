import { handleAsync } from "@inglorious/store/async"

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.js"
import {
  activateRealtime,
  deactivateRealtime,
  realtimeColumn,
} from "../../api/realtime.js"
import { readUserId } from "../../api/session.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { pageRouteChange } from "../page-route.js"
import { Notifications as renderers } from "./template.js"

/* Layer 1 of the notification system: the in-app bell. One entity carries the
   unread count the bell badge reads on every page, and the list the
   /notifications tab shows. It is kept fresh two ways: a full load at sign-in
   and whenever the tab opens, and a realtime nudge on any write to the user's
   rows (a new notification, a withdrawal cascade, a mark from a peer
   device), so the badge fills while the user browses elsewhere.

   The channel binds to the caller JWT at subscribe time, so it is only
   activated after a load that proves a session; the match still reads
   readUserId() live, so a rebind after a peer device's mark never widens. */

const listLoad = handleAsync("listLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run: fetchMyNotifications,
  success(entity, items) {
    entity.items = items
    entity.unread = items.filter((item) => !item.read).length
    entity.status = "ready"
    // The channel binds to the JWT at subscribe time, so it is activated here
    // rather than in create(): a boot that restored a session activates the
    // type before the client holds a token, and an anon-binding would remain
    // deaf to this user's rows from then on. Loaded with a session, both are
    // guaranteed: every reload that reaches success ran through one.
    activateRealtime(entity.id, {
      table: "notifications",
      event: `#${entity.id}:listLoad`,
      payload: null,
      match: (change) => realtimeColumn(change, "user_id") === readUserId(),
    })
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? t("notifications.error")
  },
})

// Where a tap on a row lands. Direct answers: a received application goes
// to the sender's review page while the event is open (its detail with the
// recap once it is not), a decided application to the application's own
// detail, everything else about an event to the event.
export function pathFor(item) {
  if (item.type === "application_received") {
    return item.event_status === "open" && item.event_id
      ? paths.receivedApplications(item.event_id)
      : item.event_id
        ? paths.event(item.event_id)
        : paths.events
  }
  if (
    item.type === "application_selected" ||
    item.type === "application_rejected"
  ) {
    return item.application_id
      ? paths.application(item.application_id)
      : paths.applications
  }
  return item.event_id ? paths.event(item.event_id) : paths.events
}

export const Notifications = {
  ...renderers,
  ...listLoad,

  create(entity) {
    entity.items ??= []
    entity.unread ??= 0
    entity.status ??= "idle"
    entity.error ??= null
    // The tablet+ drawer the shell opens over the page; closed at rest.
    entity.isPanelOpen ??= false
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
  },

  routeChange: pageRouteChange(routeOpen, routeClose),

  render(entity, api) {
    // Snapshotted values into per-row closures: a click fires long after the
    // render that built it, and reading the live entity by then can throw
    // (the same rule the realtime wiring has obeyed forever).
    const id = entity.id
    return this.renderInbox({
      entity,
      onOpenRow: (item) => {
        const rowId = item.id
        const path = pathFor(item)
        api.notify(`#${id}:readSet`, rowId)
        api.notify("#router:navigate", path)
      },
      onMarkAll: () => api.notify(`#${id}:readAll`),
    }, api)
  },

  // Opening a row marks it read — every path out leads to what the row is
  // about — and the shell navigates right after, in the same batch.
  readSet(entity, id) {
    const item = entity.items.find((row) => row.id === id)
    if (item && !item.read) {
      item.read = true
      entity.unread = Math.max(entity.unread - 1, 0)
      void markNotificationRead(id).catch(() => {
        // The badge is optimistic; the database keeps it, and the realtime
        // nudge corrects the local view if the write failed.
        item.read = false
        if (entity.status === "ready") {
          entity.unread = Math.min(entity.unread + 1, entity.items.length)
        }
      })
    }
  },

  readAll(entity) {
    if (entity.unread === 0) return
    const before = entity.items.filter((item) => !item.read).map((i) => i.id)
    entity.items.forEach((item) => {
      item.read = true
    })
    entity.unread = 0
    void markAllNotificationsRead().catch(() => {
      // The optimistic flip rolled back: the realtime nudge would have done
      // the same, but until it arrives the badge stays honest.
      const leftOut = new Set(before)
      entity.items.forEach((item) => {
        if (leftOut.has(item.id)) item.read = false
      })
      entity.unread = before.length
    })
  },

  /* Sign-out: the feed stops being this user's. Rows are dropped so a stale
     list never shows across the sign-in boundary; the next sign-in hears
     trackSession and loads again. The drawer goes down with the feed: an
     open panel outliving its session would hang over the sign-in screen. */
  resetForSignOut(entity) {
    // The channel was bound with the leaving user's JWT; no rows may keep
    // flowing. The next sign-in loads the feed, which rebinds the channel.
    deactivateRealtime(entity.id)
    entity.isPanelOpen = false
    entity.items = []
    entity.unread = 0
    entity.status = "idle"
    entity.error = null
  },

  // The bell on tablet+: open the right-side drawer over whatever page is
  // under it, and refresh the feed while opening — the badge could be stale
  // since the last visit, and a fresh load rebinds nothing (the channel is
  // already live), so it is cheap.
  panelOpen(entity, _payload, api) {
    entity.isPanelOpen = true
    api.notify(`#${entity.id}:listLoad`)
  },

  panelClose(entity) {
    entity.isPanelOpen = false
  },
}

function routeOpen(entity, _payload, api) {
  api.notify(`#${entity.id}:listLoad`)
}

// Leaving the tab keeps the rows: the bell badge outside this page reads the
// very list this page fills, so emptying it on exit would orphan the badge.
function routeClose(entity) {
  entity.status = entity.items.length ? "ready" : "idle"
}
