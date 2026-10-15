// Same entry as the app: the store first. Importing a screen first makes
// realtime.js pull the store in before its Supabase client is ready.
import "../store/index.js"

import { expect, test } from "vitest"

import { ApplicationDetail } from "../types/application-detail/index.js"
import { ApplicationList } from "../types/application-list/index.js"
import { ApplicationsReceived } from "../types/applications-received/index.js"
import { EventDetail } from "../types/event-detail/index.js"
import { EventList } from "../types/event-list/index.js"
import { Profile } from "../types/profile/index.js"
import { supabase } from "./client.js"

const CLOSE_TIMEOUT_MS = 10000
// Vitest's default test timeout is 5s, so the poll would be cut off first.
const TEST_TIMEOUT_MS = CLOSE_TIMEOUT_MS + 5000

const screens = [
  {
    name: "event list",
    type: EventList,
    keys: (id) => [`${id}:events`, `${id}:applications`],
  },
  {
    name: "event detail",
    type: EventDetail,
    keys: (id) => [id],
    // The loaded branch reads the event. Loading is what render does before it arrives.
    prepare: (entity) => {
      entity.status = "loading"
    },
  },
  {
    name: "profile",
    type: Profile,
    keys: (id) => [id],
    prepare: (entity) => {
      entity.status = "loading"
    },
  },
  {
    name: "applications received",
    type: ApplicationsReceived,
    keys: (id) => [id],
  },
  { name: "application list", type: ApplicationList, keys: (id) => [id] },
  { name: "application detail", type: ApplicationDetail, keys: (id) => [id] },
]

const api = {
  notify() {},
  render() {
    return ""
  },
  getEntity() {
    return { profile: null }
  },
}

function isOpen(key) {
  const topic = `realtime:vaitu-${key}`
  return supabase.getChannels().some((channel) => channel.topic === topic)
}

test.each(screens)(
  "$name subscribes on create and drops the channel on destroy",
  async ({ type, keys, prepare }) => {
    const entity = { id: `vitest-${crypto.randomUUID()}` }
    const subscribed = keys(entity.id)
    type.create(entity)
    try {
      expect(subscribed.filter((key) => !isOpen(key))).toEqual([])
      const openBeforeRender = supabase.getChannels().length
      prepare?.(entity)
      type.render(entity, api)
      expect(supabase.getChannels().length).toBe(openBeforeRender)
    } finally {
      type.destroy(entity)
    }
    await expect
      .poll(() => subscribed.some(isOpen), { timeout: CLOSE_TIMEOUT_MS })
      .toBe(false)
  },
  TEST_TIMEOUT_MS,
)
