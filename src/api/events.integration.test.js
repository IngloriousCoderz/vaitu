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
  fetchOpenEventRegions,
  fetchOpenEventsPage,
  updateEvent,
} from "./events.js"

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

describe("the feed", () => {
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
    "finds an open event by search, style and region, and offers its region to others only",
    async () => {
      ownedUuid = crypto.randomUUID()
      const region = `Vitest ${ownedUuid}`
      ownedEventId = await createEventAs(SEEKER, ownedUuid, undefined, {
        region,
      })
      await signIn(SENDER)

      const feed = {
        categories: ["wedding"],
        details: [{ key: "style", category: "wedding", values: ["editorial"] }],
        regions: [region],
        dateFrom: null,
        dateTo: null,
        search: `ada${ownedUuid}`.toLowerCase(),
        order: [["created_at", false]],
      }
      const page = await fetchOpenEventsPage(feed, { from: 0, to: 23 })
      expect(page.events.map((event) => event.id)).toEqual([ownedEventId])
      expect(page.total).toBe(1)

      const otherStyle = await fetchOpenEventsPage(
        { ...feed, details: [{ ...feed.details[0], values: ["classic"] }] },
        { from: 0, to: 23 },
      )
      expect(otherStyle.total).toBe(0)

      expect(await fetchOpenEventRegions()).toContain(region)
      expect(await fetchOpenEventRegions(["wedding"])).toContain(region)
      expect(await fetchOpenEventRegions(["festival"])).not.toContain(region)

      await signIn(SEEKER)
      expect(await fetchOpenEventRegions()).not.toContain(region)
    },
    TEST_TIMEOUT_MS,
  )
})
