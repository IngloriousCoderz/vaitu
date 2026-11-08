import trophyOutline from "@iconify-icons/material-symbols/trophy-outline"
import { handleAsync } from "@inglorious/store/async"
import { optimistic } from "@inglorious/store/optimistic"
import { pageRouteChange } from "@inglorious/web/router"

import { errorKey } from "../../api/errors.js"
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.js"
import { NO_UNREAD, WIDE_QUERY } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { feedLine, template } from "./template.js"

const ONE_NOTIFICATION = 1
const WON_TOAST_MS = 10000
// Good news is success, bad news a warning, everything else info.
const TOAST_COLORS = {
  application_selected: "success",
  agreement_confirmed: "success",
  application_rejected: "warning",
  application_withdrawn: "warning",
  job_cancelled: "warning",
  agreement_rejected: "warning",
  settlement_contested: "warning",
}

const load = handleAsync("load", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  run: fetchMyNotifications,
  success(entity, items, api) {
    if (entity.knownIds && !isInboxOpen(entity)) {
      for (const item of arrivals(items, entity.knownIds)) {
        api.notify("#toasts:show", toastFor(item))
      }
    }
    entity.knownIds = items.map((item) => item.id)
    entity.items = items
    entity.unread = items.filter((item) => !item.is_read).length
    entity.status = "ready"
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = errorKey(err, "notifications.error")
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
    return item.job_status === "open" && item.job_id
      ? paths.receivedApplications(item.job_id)
      : item.job_id
        ? paths.job(item.job_id)
        : paths.jobs
  }
  if (item.type === "job_cancelled") return paths.applications
  if (item.type === "settlement_contested") {
    if (item.application_id) return paths.application(item.application_id)
    return item.job_id ? paths.receivedApplications(item.job_id) : paths.jobs
  }
  if (
    item.type === "job_outcome_due" ||
    item.type === "agreement_confirmed" ||
    item.type === "agreement_rejected"
  ) {
    return item.job_id ? paths.receivedApplications(item.job_id) : paths.jobs
  }
  if (
    item.type === "application_selected" ||
    item.type === "application_rejected" ||
    item.type === "job_reviewed" ||
    item.type === "agreement_proposed" ||
    item.type === "settlement_due"
  ) {
    return item.application_id
      ? paths.application(item.application_id)
      : paths.applications
  }
  return item.job_id ? paths.job(item.job_id) : paths.jobs
}

// The unread notifications the last load did not have. The first load only
// learns what is there: what was waiting before the app opened is not news.
export function arrivals(items, knownIds) {
  const known = new Set(knownIds)
  return items.filter((item) => !item.is_read && !known.has(item.id))
}

export function toastFor(item) {
  const isWon = item.type === "application_selected"
  return {
    title: isWon ? t("toasts.won") : undefined,
    message: feedLine(item),
    color: TOAST_COLORS[item.type] ?? "info",
    icon: isWon ? trophyOutline : undefined,
    duration: isWon ? WON_TOAST_MS : undefined,
    notificationId: item.id,
    path: pathFor(item),
  }
}

function isInboxOpen(entity) {
  return (
    entity.isPanelOpen ||
    (typeof window !== "undefined" &&
      window.location.pathname === paths.notifications)
  )
}

export const Notifications = {
  ...template,
  ...load,

  create(entity, _, api) {
    entity.items ??= []
    entity.unread ??= 0
    entity.status ??= "idle"
    entity.error ??= null
    entity.isPanelOpen ??= false
    entity.knownIds ??= null

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
      api.notify("#router:navigate", { to: paths.jobs, replace: true })
      return
    }
    if (!entity.isPanelOpen) return
    entity.isPanelOpen = false
    api.notify("#router:navigate", { to: paths.notifications, replace: true })
  },

  routeChange: pageRouteChange({ open: routeOpen, close: routeClose }),

  renderHeader(entity, api) {
    const id = entity.id
    return this.renderNotificationsHeader({
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
    entity.knownIds = null
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
    api.notify("#router:navigate", { to: paths.jobs, replace: true })
    return
  }
  api.notify(`#${entity.id}:load`)
}

function routeClose(entity) {
  entity.status = entity.items.length ? "ready" : "idle"
}

export { NotificationsPanel } from "./template.js"
