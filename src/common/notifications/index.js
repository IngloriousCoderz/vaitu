import { handleAsync } from "@inglorious/store/async"
import { optimistic } from "@inglorious/store/optimistic"

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.js"
import { NO_UNREAD } from "../../constants/index.js"
import { paths } from "../../routes.js"
import { pageRouteChange } from "../page-route.js"
import { Notifications as renderers } from "./template.js"

const ONE_NOTIFICATION = 1

const WIDE_QUERY = "(min-width: 48rem)"

const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run: fetchMyNotifications,
  success(entity, items) {
    entity.items = items
    entity.unread = items.filter((item) => !item.is_read).length
    entity.status = "ready"
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "notifications.error"
  },
})

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

const viewportWatchers = new Map()

export function pathFor(item) {
  if (
    item.type === "application_received" ||
    item.type === "application_withdrawn"
  ) {
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
    entity.isPanelOpen ??= false

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
    const watcher = viewportWatchers.get(entity.id)
    if (watcher) {
      watcher.mq.removeEventListener("change", watcher.listener)
      viewportWatchers.delete(entity.id)
    }
  },

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
    // Snapshot values: a click fires after the render, when reading the entity
    // can throw.
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

  readSet(entity, id, api) {
    const item = entity.items.find((row) => row.id === id)
    if (item && !item.is_read) api.notify(`#${entity.id}:readSave`, id)
  },

  sessionStart(entity, _, api) {
    api.notify(`#${entity.id}:load`)
  },

  sessionEnd(entity) {
    entity.isPanelOpen = false
    entity.items = []
    entity.unread = 0
    entity.status = "idle"
    entity.error = null
  },

  panelOpen(entity, _payload, api) {
    entity.isPanelOpen = true
    api.notify(`#${entity.id}:load`)
  },

  panelClose(entity) {
    entity.isPanelOpen = false
  },
}

function routeOpen(entity, _payload, api) {
  if (typeof window !== "undefined" && window.matchMedia(WIDE_QUERY).matches) {
    api.notify(`#${entity.id}:panelOpen`)
    api.notify("#router:navigate", { to: paths.events, replace: true })
    return
  }
  api.notify(`#${entity.id}:load`)
}

function routeClose(entity) {
  entity.status = entity.items.length ? "ready" : "idle"
}
