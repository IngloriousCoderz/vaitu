import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../api/notifications.js", () => ({
  fetchMyNotifications: vi.fn(),
  markNotificationRead: vi.fn(async () => []),
  markAllNotificationsRead: vi.fn(async () => []),
}))
vi.mock("../../api/realtime.js", () => ({
  activateRealtime: vi.fn(),
  deactivateRealtime: vi.fn(),
  realtimeColumn: (change, column) => change?.new?.[column] ?? null,
}))
vi.mock("../../api/session.js", () => ({ readUserId: vi.fn() }))
// No DOM environment here: the house drawer is exercised live and by build.
vi.mock("@inglorious/ui/drawer", () => ({
  Drawer: { render: (props) => `drawer(${props.isOpen ? "open" : "closed"})` },
}))

import { createStore } from "@inglorious/store"

import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notifications.js"
import { activateRealtime, deactivateRealtime } from "../../api/realtime.js"
import { readUserId } from "../../api/session.js"
import { Notifications, pathFor } from "./index.js"
import { NotificationsPanel } from "./template.js"

beforeEach(() => {
  vi.clearAllMocks()
  readUserId.mockReturnValue("user-1")
})

describe("Notifications.type-composition", () => {
  // The store composes every type before honoring it; the render bridge talks
  // to its siblings through `this`, so the composed type must have kept them
  // and the render must survive a store-fresh entity.
  it("the composed type still knows its renderers", () => {
    const store = createStore({
      types: { Notifications },
      entities: {
        notifications: { type: "Notifications" },
      },
    })
    const composed = store.getType("Notifications")
    expect(typeof composed.renderInbox).toBe("function")
    expect(typeof composed.renderHeader).toBe("function")
    expect(typeof composed.loadRun).toBe("function")
    expect(typeof composed.routeChange).toBe("function")

    const entity = store.getState().notifications
    const html = composed.render(entity, {
      notify: () => {},
    })
    expect(html).toBeTruthy()
  })
})

describe("Notifications.create", () => {
  it("starts empty and quiet: the channel binds only after a load", () => {
    const entity = { id: "notifications" }
    Notifications.create(entity)
    expect(entity.items).toEqual([])
    expect(entity.unread).toBe(0)
    expect(entity.status).toBe("idle")
    // The drawer the shell opens starts closed, like the tab it mirrors.
    expect(entity.isPanelOpen).toBe(false)
    // Realtime waits for the first successful load: a boot restoring a
    // session has no JWT yet, and an anon binding would stay deaf.
    expect(activateRealtime).not.toHaveBeenCalled()
  })
})

describe("Notifications.panelOpen", () => {
  it("opens the drawer and refreshes the feed in the same hand", async () => {
    const entity = { id: "notifications", isPanelOpen: false, status: "ready" }
    fetchMyNotifications.mockResolvedValue([notification()])
    const api = makeApi(entity)
    Notifications.panelOpen(entity, undefined, api)
    expect(entity.isPanelOpen).toBe(true)
    expect(entity.status).toBe("loading")
    await vi.waitFor(() => expect(entity.status).toBe("ready"))
    expect(entity.unread).toBe(1)
  })

  it("panelClose folds the drawer without dropping the rows", () => {
    const entity = {
      id: "notifications",
      isPanelOpen: true,
      items: [notification()],
    }
    Notifications.panelClose(entity)
    expect(entity.isPanelOpen).toBe(false)
    expect(entity.items).toHaveLength(1)
    expect(entity.unread).toBeUndefined()
  })
})

describe("Notifications.load", () => {
  it("fills the feed, counts the unread, and binds the channel", async () => {
    const entity = { id: "notifications" }
    Notifications.create(entity)
    fetchMyNotifications.mockResolvedValue([
      notification(),
      notification({ id: "n2", is_read: true, type: "event_closed" }),
    ])

    Notifications.load(entity, undefined, makeApi(entity))
    await vi.waitFor(() => expect(entity.status).toBe("ready"))

    expect(entity.items).toHaveLength(2)
    expect(entity.unread).toBe(1)
    expect(entity.error).toBeNull()

    const [id, config] = activateRealtime.mock.calls.at(-1)
    expect(id).toBe("notifications")
    expect(config.table).toBe("notifications")
    expect(config.event).toBe("#notifications:load")

    // Another user's row never opens the door.
    readUserId.mockReturnValue("user-1")
    expect(config.match({ new: { user_id: "user-2" } })).toBe(false)
    expect(config.match({ new: { user_id: "user-1" } })).toBe(true)
  })

  it("a failed load becomes a readable error", async () => {
    const entity = { id: "notifications" }
    Notifications.create(entity)
    fetchMyNotifications.mockRejectedValue(
      Object.assign(new Error("network gone"), { message: "network gone" }),
    )

    Notifications.load(entity, undefined, makeApi(entity))
    await vi.waitFor(() => expect(entity.status).toBe("error"))

    expect(entity.error).toBe("network gone")
  })
})

describe("Notifications.readSet", () => {
  it("marks one row read, badge first, database second", async () => {
    const entity = {
      id: "notifications",
      items: [notification()],
      unread: 1,
      status: "ready",
    }
    Notifications.readSet(entity, "n1", makeApi(entity))

    expect(entity.unread).toBe(0)
    expect(entity.items[0].is_read).toBe(true)
    expect(markNotificationRead).toHaveBeenCalledWith("n1")
  })

  it("a failed write rolls the row back", async () => {
    const entity = {
      id: "notifications",
      items: [notification()],
      unread: 1,
      status: "ready",
    }
    markNotificationRead.mockRejectedValue(new Error("offline"))
    Notifications.readSet(entity, "n1", makeApi(entity))

    await vi.waitFor(() => expect(entity.unread).toBe(1))
    expect(entity.items[0].is_read).toBe(false)
  })
})

describe("Notifications.readSet on a read row", () => {
  it("writes nothing", () => {
    const entity = {
      id: "notifications",
      items: [notification({ is_read: true })],
      unread: 0,
      status: "ready",
    }
    Notifications.readSet(entity, "n1", makeApi(entity))

    expect(markNotificationRead).not.toHaveBeenCalled()
  })
})

describe("Notifications.viewportChange", () => {
  it("unfolds an open drawer into the page, replacing the history entry", () => {
    const entity = { id: "notifications", isPanelOpen: true }
    const notified = []
    Notifications.viewportChange(
      entity,
      { isWide: false },
      { notify: (type, payload) => notified.push([type, payload]) },
    )

    expect(entity.isPanelOpen).toBe(false)
    expect(notified).toEqual([
      ["#router:navigate", { to: "/notifications", replace: true }],
    ])
  })
})

describe("Notifications.readAll", () => {
  it("empties the badge in one go", () => {
    const entity = {
      id: "notifications",
      items: [
        notification(),
        notification({ id: "n2", type: "event_updated" }),
      ],
      unread: 2,
      status: "ready",
    }
    Notifications.readAll(entity, undefined, makeApi(entity))

    expect(entity.unread).toBe(0)
    expect(entity.items.every((item) => item.is_read)).toBe(true)
    expect(markAllNotificationsRead).toHaveBeenCalled()
  })

  it("rolls everything back when the write fails", async () => {
    const entity = {
      id: "notifications",
      items: [notification(), notification({ id: "n2" })],
      unread: 2,
      status: "ready",
    }
    markAllNotificationsRead.mockRejectedValue(new Error("offline"))
    Notifications.readAll(entity, undefined, makeApi(entity))
    expect(entity.unread).toBe(0)

    await vi.waitFor(() => expect(entity.unread).toBe(2))
    expect(entity.items.every((item) => !item.is_read)).toBe(true)
  })
})

describe("Notifications.sessionEnd", () => {
  it("leaves nothing of the previous user behind, and closes the channel", () => {
    const entity = {
      id: "notifications",
      items: [notification()],
      unread: 1,
      status: "ready",
      error: "whatever",
      isPanelOpen: true,
    }
    Notifications.sessionEnd(entity)
    expect(entity.items).toEqual([])
    expect(entity.unread).toBe(0)
    expect(entity.status).toBe("idle")
    expect(entity.error).toBeNull()
    // An open drawer outliving its session would hang over the sign-in screen.
    expect(entity.isPanelOpen).toBe(false)
    expect(deactivateRealtime).toHaveBeenCalledWith("notifications")
  })
})

describe("pathFor", () => {
  it("a received application visits the review page while the event is open", () => {
    expect(pathFor(notification({ event_status: "open" }))).toBe(
      "/events/e1/applications",
    )
  })

  it("a received application on a closed event visits the event itself", () => {
    expect(pathFor(notification({ event_status: "closed" }))).toBe("/events/e1")
  })

  it("a decided application visits the application detail", () => {
    expect(pathFor(notification({ type: "application_selected" }))).toBe(
      "/applications/a1",
    )
    expect(
      pathFor(
        notification({ type: "application_rejected", event_status: "open" }),
      ),
    ).toBe("/applications/a1")
  })

  it("everything about an event lands on the event", () => {
    expect(pathFor(notification({ type: "event_updated" }))).toBe("/events/e1")
    expect(pathFor(notification({ type: "event_closed" }))).toBe("/events/e1")
  })

  it("a row whose subject is gone falls back to the lists", () => {
    expect(
      pathFor(notification({ type: "application_received", event_id: null })),
    ).toBe("/events")
    expect(
      pathFor(
        notification({ type: "application_selected", application_id: null }),
      ),
    ).toBe("/applications")
  })
})

describe("NotificationsPanel.render", () => {
  it("renders the drawer open when the bell opened it, folded when not", () => {
    const entity = {
      id: "notifications",
      items: [
        notification(),
        notification({ id: "n2", is_read: true, type: "event_updated" }),
      ],
      unread: 1,
      status: "ready",
      isPanelOpen: true,
    }
    const open = NotificationsPanel.render({
      isOpen: entity.isPanelOpen,
      entity,
      onClose: () => {},
      onOpenRow: () => {},
      onMarkAll: () => {},
    })
    expect(open).toContain("drawer(open)")
    const closed = NotificationsPanel.render({
      isOpen: false,
      entity: { ...entity, isPanelOpen: false },
      onClose: () => {},
      onOpenRow: () => {},
      onMarkAll: () => {},
    })
    expect(closed).toContain("drawer(closed)")
  })
})

// handleAsync dispatches its lifecycle through api.notify; this stand-in does
// the same, resolving the next handler by the event name it was handed, so the
// async chain runs to the end inside the test.
function makeApi(entity) {
  const api = {
    notify(event, payload) {
      const name = event.slice(1).split(":")[1]
      Notifications[name]?.(entity, payload, api)
    },
  }
  return api
}

function notification(over = {}) {
  return {
    id: "n1",
    type: "application_received",
    is_read: false,
    created_at: new Date().toISOString(),
    event_id: "e1",
    application_id: "a1",
    event_title: "The Marchetti wedding",
    event_status: "open",
    applicant_name: "Test Sender",
    ...over,
  }
}
