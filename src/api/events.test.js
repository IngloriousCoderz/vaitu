import { afterAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  coupleTitle,
  createEventAs,
  deleteOwnedEvent,
  deleteOwnedEventByTitle,
  eventPayload,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import {
  createEvent,
  deleteEvent,
  fetchEventForEdit,
  fetchMyEvents,
  updateEvent,
} from "./events.js"

// A Supabase call waits up to 15s. Vitest's default of 5s would hide that error.
const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

let eventId = null
let testUuid = null

afterAll(async () => {
  try {
    if (eventId) await deleteOwnedEvent(eventId)
    else if (testUuid) {
      await deleteOwnedEventByTitle(eventPayload(testUuid).title)
    }
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-in user can create an event",
  async () => {
    testUuid = crypto.randomUUID()
    await signIn(SEEKER)
    await createEvent(eventPayload(testUuid))

    const mine = await fetchMyEvents()
    const created = mine.find((event) => event.title === coupleTitle(testUuid))
    expect(
      created,
      `event ${coupleTitle(testUuid)} not found among ${mine.length} events`,
    ).toBeTruthy()
    eventId = created.id
  },
  TEST_TIMEOUT_MS,
)

describe("deleting an event", () => {
  let ownedEventId = null
  let ownedUuid = null

  afterAll(async () => {
    try {
      if (ownedEventId) await deleteOwnedEvent(ownedEventId)
      else if (ownedUuid) {
        await deleteOwnedEventByTitle(eventPayload(ownedUuid).title)
      }
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "another account cannot delete it",
    async () => {
      ownedUuid = crypto.randomUUID()
      ownedEventId = await createEventAs(SEEKER, ownedUuid)

      await signIn(SENDER)
      // The policy deletes nothing and reports no error.
      await deleteEvent(ownedEventId)

      await signIn(SEEKER)
      const mine = await fetchMyEvents()
      expect(
        mine.some((event) => event.id === ownedEventId),
        "the other account deleted the event",
      ).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )
})

describe("editing an event", () => {
  let ownedEventId = null
  let ownedUuid = null

  afterAll(async () => {
    try {
      if (ownedEventId) await deleteOwnedEvent(ownedEventId)
      else if (ownedUuid) {
        await deleteOwnedEventByTitle(eventPayload(ownedUuid).title)
      }
    } finally {
      await signOut()
    }
  }, TEST_TIMEOUT_MS)

  test(
    "another account cannot edit it",
    async () => {
      ownedUuid = crypto.randomUUID()
      const payload = eventPayload(ownedUuid)
      ownedEventId = await createEventAs(SEEKER, ownedUuid)

      await signIn(SENDER)
      // The policy updates nothing and reports no error.
      await updateEvent(ownedEventId, {
        ...payload,
        title: `Hijack ${ownedUuid}`,
      })

      await signIn(SEEKER)
      const row = await fetchEventForEdit(ownedEventId)
      expect(row.title).toBe(payload.title)
    },
    TEST_TIMEOUT_MS,
  )
})
