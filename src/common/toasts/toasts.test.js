import { describe, expect, it, vi } from "vitest"

import { Toasts } from "./index.js"

function entity() {
  const toasts = { id: "toasts" }
  Toasts.create(toasts)
  return toasts
}

describe("Toasts", () => {
  it("shows the newest first, three at most", () => {
    const toasts = entity()
    for (const message of ["a", "b", "c", "d"]) {
      Toasts.show(toasts, { message })
    }
    expect(toasts.toasts.map((toast) => toast.message)).toEqual(["d", "c", "b"])
  })

  it("opening one marks its notification read and goes to its page", () => {
    const toasts = entity()
    Toasts.show(toasts, {
      message: "You got it",
      notificationId: "n1",
      path: "/applications/a1",
    })
    const api = { notify: vi.fn() }

    Toasts.open(toasts, toasts.toasts[0].id, api)

    expect(toasts.toasts).toEqual([])
    expect(api.notify.mock.calls).toEqual([
      ["#notifications:readSet", "n1"],
      ["#router:navigate", "/applications/a1"],
    ])
  })

  it("closes one, and forgets them all when the session ends", () => {
    const toasts = entity()
    Toasts.show(toasts, { message: "a" })
    Toasts.show(toasts, { message: "b" })

    Toasts.close(toasts, toasts.toasts[1].id)
    expect(toasts.toasts.map((toast) => toast.message)).toEqual(["b"])

    Toasts.sessionEnd(toasts)
    expect(toasts.toasts).toEqual([])
  })

  it("renders toasts that open their page, with a translated close", () => {
    const toasts = entity()
    Toasts.show(toasts, { message: "You got it", path: "/applications/a1" })
    const api = { notify: vi.fn() }
    const renderToaster = vi.spyOn(Toasts, "renderToaster")

    Toasts.render(toasts, api)
    const props = renderToaster.mock.calls[0][0]
    props.onClick(1)

    expect(props.toasts).toEqual(toasts.toasts)
    expect(props.dismissLabel).toBeTruthy()
    expect(api.notify).toHaveBeenCalledWith("#toasts:open", 1)
    renderToaster.mockRestore()
  })
})
