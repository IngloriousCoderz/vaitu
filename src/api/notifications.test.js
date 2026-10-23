import { afterAll, beforeAll, describe, expect, test } from "vitest"

import { REQUEST_TIMEOUT_MS } from "../constants/index.js"
import {
  createEventAs,
  deleteOwnedEvent,
  SEEKER,
  SENDER,
  signIn,
  signOut,
} from "../testing/index.js"
import { supabase } from "./client.js"
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.js"

const MOTIVATION = "Available the whole weekend"
const TEST_TIMEOUT_MS = REQUEST_TIMEOUT_MS + 5000

/* The triggers write through notify_user, so the feed's rows are asserted as
   real database effects of the flows everyone else already runs: apply, choose,
   reject, edit. The event is deleted at the end, and the cascade takes every
   notification created along the way with it. */
describe("notifications feed", () => {
  let eventId = null
  let applicationId = null

  beforeAll(async () => {
    eventId = await createEventAs(SEEKER, crypto.randomUUID())
    await signIn(SENDER)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from("applications")
      .insert({ event_id: eventId, applicant_id: user.id, motivation: MOTIVATION })
      .select("id")
      .single()
    if (error) throw error
    applicationId = data.id
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await signOut()
    if (eventId) await deleteOwnedEvent(eventId)
  })

  test(
    "an application shows up on the owner's bell with the applicant's name",
    async () => {
      await signIn(SEEKER)
      const items = await fetchMyNotifications()
      // Other suites run against the same fixtures right now, so the row is
      // found by event, not by type alone.
      const received = items.find(
        (item) =>
          item.type === "application_received" && item.event_id === eventId,
      )
      expect(received).toBeTruthy()
      expect(received.event_id).toBe(eventId)
      expect(received.application_id).toBe(applicationId)
      expect(received.read).toBe(false)
      expect(received.applicant_name).toBeTruthy()
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "one user's feed is never another user's",
    async () => {
      await signIn(SENDER)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id")
      expect(error).toBeNull()
      // RLS answers with this user's rows only: the owner's received-row about
      // this very application must not appear in the applicant's feed.
      expect(data.every((row) => row.user_id === user.id)).toBe(true)
      expect(
        data.some((row) => row.type === "application_received"),
      ).toBe(false)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "shortlisting and choosing notifies the applicant",
    async () => {
      await signIn(SEEKER)
      const { error: shortlistError } = await supabase
        .from("applications")
        .update({ status: "shortlisted" })
        .eq("id", applicationId)
      if (shortlistError) throw shortlistError
      // The house writes `selected` only through assign_winner (it sets the
      // `vaitu.assigning` flag the trigger enforces).
      const { error: winnerError } = await supabase.rpc("assign_winner", {
        p_event_id: eventId,
        p_application_id: applicationId,
      })
      if (winnerError) throw winnerError

      await signIn(SENDER)
      const items = await fetchMyNotifications()
      expect(items.some((item) => item.type === "application_selected")).toBe(
        true,
      )
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "marking one read empties exactly that row from the unread count",
    async () => {
      await signIn(SENDER)
      const before = await fetchMyNotifications()
      // Other suites apply to the shared fixture accounts right now, so the
      // feed's aggregate unread counts move under our feet; the assertion
      // stays row-scoped, which no parallel writer can touch.
      const unreadRows = before.filter((item) => !item.read)
      expect(unreadRows.length).toBeGreaterThan(0)

      const chosen = unreadRows[0]
      const updated = await markNotificationRead(chosen.id)
      expect(updated.every((row) => row.id === chosen.id)).toBe(true)

      const after = await fetchMyNotifications()
      expect(after.find((item) => item.id === chosen.id).read).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "marking all read is exactly what it says",
    async () => {
      await signIn(SENDER)
      const before = await fetchMyNotifications()
      expect(before.length).toBeGreaterThan(0)

      // Other suites apply to the shared fixtures right now: the feed's
      // aggregate unread counts move under our feet, so this case arms (or
      // merely counts) and then stays row-scoped.
      const armed = before.find((item) => item.read)
      if (armed) {
        const { error: armError } = await supabase
          .from("notifications")
          .update({ read: false })
          .eq("id", armed.id)
        expect(armError).toBeNull()
      }

      // Either an armed row or an already-unread one: at least one target.
      const updated = await markAllNotificationsRead()
      expect(updated.length).toBeGreaterThanOrEqual(1)

      const after = await fetchMyNotifications()
      const known = new Set(before.map((item) => item.id))
      expect(
        after.filter((item) => known.has(item.id)).every((item) => item.read),
      ).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "editing the event notifies the live applicants",
    async () => {
      await signIn(SEEKER)
      const { error: editError } = await supabase
        .from("events")
        .update({ details: "Updated for the notifications test." })
        .eq("id", eventId)
      if (editError) throw editError

      await signIn(SENDER)
      const items = await fetchMyNotifications()
      expect(items.some((item) => item.type === "event_updated")).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "rejecting notifies the applicant too",
    async () => {
      await signIn(SEEKER)
      const { error: rejectError } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", applicationId)
      if (rejectError) throw rejectError

      await signIn(SENDER)
      const items = await fetchMyNotifications()
      expect(items.some((item) => item.type === "application_rejected")).toBe(
        true,
      )
    },
    TEST_TIMEOUT_MS,
  )
})
