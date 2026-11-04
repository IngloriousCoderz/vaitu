import { createStore } from "@inglorious/store"
import { afterAll, expect, test, vi } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  ANTONY,
  createEventAs,
  GIADA,
  signIn,
  signOut,
} from "../testing/index.js"
import { supabase } from "./client.js"
import { deleteEvent } from "./events.js"
import { liveAlways } from "./live.js"

const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

let eventId = null

afterAll(async () => {
  if (eventId) {
    await signIn(GIADA)
    await deleteEvent(eventId)
  }
  await signOut()
})

test(
  "a change to a table the entity reads reloads it",
  async () => {
    eventId = await createEventAs(GIADA, crypto.randomUUID())
    await signIn(ANTONY)

    const load = vi.fn()
    const store = createStore({
      types: { Probe: [{ load }, liveAlways(["applications"])] },
      entities: { probe: { type: "Probe" } },
    })
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("applications").insert({
      event_id: eventId,
      applicant_id: user.id,
      motivation: "Live",
    })
    if (error) throw error

    await vi.waitFor(() => expect(load).toHaveBeenCalled(), {
      timeout: REQUEST_TIMEOUT_MS,
    })
    store.notify("remove", "probe")
  },
  TEST_TIMEOUT_MS,
)
