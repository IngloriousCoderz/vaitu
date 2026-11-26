import { createStore } from "@inglorious/store"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { Session } from "../../common/session/index.js"
import { paths } from "../../routes.js"

let report

vi.mock("../../api/auth.js", () => ({
  authAdapter: {
    onSessionChange(listener) {
      report = listener
      return () => {}
    },
  },
}))

const { Authentication } = await import("./index.js")

const USER = { id: "user-1", email: "a@b.c", app_metadata: {} }

function storeOn(route, pathname) {
  globalThis.window = { location: { pathname, search: "" } }
  const store = createStore({
    types: {
      Session,
      Authentication,
      Router: { create: (entity) => Object.assign(entity, { route }) },
    },
    entities: {
      session: { type: "Session" },
      authentication: { type: "Authentication" },
      router: { type: "Router", query: {} },
    },
    updateMode: "manual",
  })
  store.update()
  const notify = vi.spyOn(store._api, "notify")
  const sent = (type) => notify.mock.calls.filter(([event]) => event === type)
  const tell = (user) => {
    report(user)
    store.update()
  }
  return { store, sent, tell }
}

describe("the session, as the authentication entity reports it", () => {
  beforeEach(() => {
    report = null
  })

  afterEach(() => {
    delete globalThis.window
  })

  it("holds a restored user at launch, announced once, without navigating", () => {
    const { store, sent, tell } = storeOn("jobList", paths.jobs)

    tell(USER)
    tell(USER)

    expect(store.getEntity("session")).toMatchObject({
      user: { id: "user-1", email: "a@b.c" },
      isRestored: true,
    })
    expect(sent("sessionStart")).toHaveLength(1)
    expect(sent("#router:navigate")).toEqual([])
  })

  it("is restored with no one at launch, leaving the guard to decide", () => {
    const { store, sent, tell } = storeOn("jobList", paths.jobs)

    tell(null)

    expect(store.getEntity("session")).toMatchObject({
      user: null,
      isRestored: true,
    })
    expect(sent("#router:navigate")).toEqual([])
  })

  it("sends the visitor to sign in when the session ends later", () => {
    const { store, sent, tell } = storeOn("jobList", paths.jobs)
    tell(USER)

    tell(null)

    expect(store.getEntity("session").user).toBe(null)
    expect(sent("sessionEnd")).toHaveLength(1)
    expect(sent("#router:navigate")).toEqual([
      [
        "#router:navigate",
        {
          to: `${paths.login}?from=${encodeURIComponent(paths.jobs)}`,
          replace: true,
        },
      ],
    ])
  })

  it("leaves the sign-in page when a session starts by itself", () => {
    const { sent, tell } = storeOn("authentication", paths.login)
    tell(null)

    tell(USER)

    expect(sent("#router:navigate")).toEqual([
      ["#router:navigate", { to: paths.jobs, replace: true }],
    ])
  })
})
