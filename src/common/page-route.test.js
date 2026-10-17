import { describe, expect, it, vi } from "vitest"

import { pageRouteChange } from "./page-route.js"

describe("pageRouteChange", () => {
  const api = {}
  const entity = { id: "event" }

  it("opens the page with what the selector picks from the route", () => {
    const open = vi.fn()
    const close = vi.fn()
    const routeChange = pageRouteChange(open, close, (payload) => ({
      event_id: payload.params.eventId,
    }))

    routeChange(entity, { route: "event", params: { eventId: "42" } }, api)

    expect(open).toHaveBeenCalledWith(entity, { event_id: "42" }, api)
    expect(close).not.toHaveBeenCalled()
  })

  it("opens the page without arguments when there is no selector", () => {
    const open = vi.fn()
    const routeChange = pageRouteChange(open, vi.fn())

    routeChange(entity, { route: "event", params: {} }, api)

    expect(open).toHaveBeenCalledWith(entity, undefined, api)
  })

  it("closes the page when the route names another one", () => {
    const open = vi.fn()
    const close = vi.fn()
    const routeChange = pageRouteChange(open, close)

    routeChange(entity, { route: "profile", params: {} }, api)

    expect(close).toHaveBeenCalledWith(entity)
    expect(open).not.toHaveBeenCalled()
  })
})
