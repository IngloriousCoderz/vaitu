import { handleAsync } from "@inglorious/store/async"
import { optimistic } from "@inglorious/store/optimistic"

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
import { NO_UNREAD } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { pageRouteChange } from "../page-route.js"
import { Notifications as renderers } from "./template.js"

const ONE_NOTIFICATION = 1

const WIDE_QUERY = "(min-width: 48rem)"

/* Layer 1 of the notification system: the in-app bell. One entity carries the
   unread count the bell badge reads on every page, and the list the
   /notifications tab shows. It is kept fresh two ways: a full load at sign-in
   and whenever the tab opens, and a realtime nudge on any write to the user's
   rows (a new notification, a withdrawal cascade, a mark from a peer
   device), so the badge fills while the user browses elsewhere.

   The channel binds to the caller JWT at subscribe time, so it is only
   activated after a load that proves a session; the match still reads
   readUserId() live, so a rebind after a peer device's mark never widens. */

const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run: fetchMyNotifications,
  success(entity, items, api) {
    entity.items = items
    entity.unread = items.filter((item) => !item.is_read).length
    entity.status = "ready"
    // The channel binds to the JWT at subscribe time, so it is activated here
    // rather than in create(): a boot that restored a session activates the
    // type before the client holds a token, and an anon-binding would remain
    // deaf to this user's rows from then on. Loaded with a session, both are
    // guaranteed: every reload that reaches success ran through one.
    // The id is snapshotted: the match runs from a realtime message, once
    // this draft is revoked.
    const id = entity.id
    activateRealtime(
      id,
      {
        table: "notifications",
        event: `#${id}:load`,
        payload: null,
        // A row deleted with its application or event carries only its id
        // (see realtimeColumn), so a delete is matched against the feed.
        match: (change, state) =>
          change.eventType === "DELETE"
            ? state[id]?.items.some((item) => item.id === change.old?.id)
            : realtimeColumn(change, "user_id") === readUserId(),
      },
      api,
    )
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "notifications.error"
  },
})

// The badge is optimistic: a row reads as read the moment it is opened, and
// rolls back if the database refused the write. The realtime nudge corrects
// anything else.
const readSave = optimistic(
  handleAsync("readSave", { run: (id) => markNotificationRead(id) }),
  (entity, id) => ({
    items: entity.items.map((row) =>
      row.id === id ? { ...row, is_read: true } : row,
    ),
    unread: Math.max(entity.unread - ONE_NOTIFICATION, NO_UNREAD),
  }),
)

const readAll = optimistic(
  handleAsync("readAll", { run: () => markAllNotificationsRead() }),
  (entity) => ({
    items: entity.items.map((row) => ({ ...row, is_read: true })),
    unread: 0,
  }),
)

// Viewport watchers, keyed by entity id. A MediaQueryList and its listener
// are not data, so they stay out of the entity.
const viewportWatchers = new Map()

// Where a tap on a row lands. Direct answers: a received application goes
// to the sender's review page while the event is open (its detail with the
// recap once it is not), a decided application to the application's own
// detail, everything else about an event to the event. A push lands on the
// same screen: supabase/functions/push-notify/message.ts keeps a copy.
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
  ...load,

  create(entity, _, api) {
    entity.items ??= []
    entity.unread ??= 0
    entity.status ??= "idle"
    entity.error ??= null
    // The tablet+ drawer the shell opens over the page; closed at rest.
    entity.isPanelOpen ??= false

    // Viewport watcher: on tablet/desktop the canonical UI is the drawer,
    // not the full page. Crossing the 48rem boundary switches modes, which
    // viewportChange decides.
    if (typeof window !== "undefined") {
      const id = entity.id
      const mq = window.matchMedia(WIDE_QUERY)
      const listener = (e) =>
        api.notify(`#${id}:viewportChange`, { isWide: e.matches })
      mq.addEventListener("change", listener)
      viewportWatchers.set(id, { mq, listener })
    }
  },

  destroy(entity) {
    deactivateRealtime(entity.id)
    const watcher = viewportWatchers.get(entity.id)
    if (watcher) {
      watcher.mq.removeEventListener("change", watcher.listener)
      viewportWatchers.delete(entity.id)
    }
  },

  // Mobile -> tablet: the notifications page folds into the drawer.
  // Tablet -> mobile: an open drawer unfolds into the page, so the tab bar
  // entry works.
  viewportChange(entity, { isWide }, api) {
    if (isWide) {
      if (window.location.pathname !== paths.notifications) return
      api.notify(`#${entity.id}:panelOpen`)
      api.notify("#router:navigate", { to: paths.events, replace: true })
      return
    }
    if (!entity.isPanelOpen) return
    entity.isPanelOpen = false
    api.notify("#router:navigate", { to: paths.notifications, replace: true })
  },

  routeChange: pageRouteChange(routeOpen, routeClose),

  renderHeader(entity, api) {
    const id = entity.id
    return renderers.renderHeader({
      unread: entity.unread,
      onMarkAll: () => api.notify(`#${id}:readAll`),
    })
  },

  render(entity, api) {
    // Snapshotted values into per-row closures: a click fires long after the
    // render that built it, and reading the live entity by then can throw
    // (the same rule the realtime wiring has obeyed forever).
    const id = entity.id
    return this.renderInbox(
      {
        entity,
        onOpenRow: (item) => {
          const rowId = item.id
          const path = pathFor(item)
          api.notify(`#${id}:readSet`, rowId)
          api.notify("#router:navigate", path)
        },
        onMarkAll: () => api.notify(`#${id}:readAll`),
      },
      api,
    )
  },

  ...readSave,
  ...readAll,

  // Opening a row marks it read — every path out leads to what the row is
  // about — and the shell navigates right after, in the same batch.
  readSet(entity, id, api) {
    const item = entity.items.find((row) => row.id === id)
    if (item && !item.is_read) api.notify(`#${entity.id}:readSave`, id)
  },

  // The badge is live from the first screen, not the first visit to the tab.
  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  /* Sign-out: the feed stops being this user's. Rows are dropped so a stale
     list never shows across the sign-in boundary, and the next sessionStart
     loads again. The drawer goes down with the feed: an open panel outliving
     its session would hang over the sign-in screen. */
  sessionEnd(entity) {
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
    api.notify(`#${entity.id}:load`)
  },

  panelClose(entity) {
    entity.isPanelOpen = false
  },
}

function routeOpen(entity, _payload, api) {
  // Tablet/desktop: the /notifications route is only a deep-link / restored
  // session. The canonical UI is the right-side drawer — open it and return
  // to where the user was (or home), keeping the feed loaded in the panel.
  if (typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches) {
    api.notify(`#${entity.id}:panelOpen`)
    // Return to the last valid place (or /events) without a full page reload.
    api.notify("#router:navigate", { to: paths.events, replace: true })
    return
  }
  // Mobile: full page as before.
  api.notify(`#${entity.id}:load`)
}

// Leaving the tab keeps the rows: the bell badge outside this page reads the
// very list this page fills, so emptying it on exit would orphan the badge.
function routeClose(entity) {
  entity.status = entity.items.length ? "ready" : "idle"
}
