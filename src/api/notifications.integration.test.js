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
      .insert({
        event_id: eventId,
        applicant_id: user.id,
        motivation: MOTIVATION,
      })
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
      const received = items.find(
        (item) =>
          item.type === "application_received" && item.event_id === eventId,
      )
      expect(received).toBeTruthy()
      expect(received.event_id).toBe(eventId)
      expect(received.application_id).toBe(applicationId)
      expect(received.is_read).toBe(false)
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
      expect(data.every((row) => row.user_id === user.id)).toBe(true)
      expect(data.some((row) => row.type === "application_received")).toBe(
        false,
      )
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
      const unreadRows = before.filter((item) => !item.is_read)
      expect(unreadRows.length).toBeGreaterThan(0)

      const chosen = unreadRows[0]
      const updated = await markNotificationRead(chosen.id)
      expect(updated.every((row) => row.id === chosen.id)).toBe(true)

      const after = await fetchMyNotifications()
      expect(after.find((item) => item.id === chosen.id).is_read).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "marking all read is exactly what it says",
    async () => {
      await signIn(SENDER)
      const before = await fetchMyNotifications()
      expect(before.length).toBeGreaterThan(0)

      const armed = before.find((item) => item.is_read)
      if (armed) {
        const { error: armError } = await supabase
          .from("notifications")
          .update({ is_read: false })
          .eq("id", armed.id)
        expect(armError).toBeNull()
      }

      const updated = await markAllNotificationsRead()
      expect(updated.length).toBeGreaterThanOrEqual(1)

      const after = await fetchMyNotifications()
      const known = new Set(before.map((item) => item.id))
      expect(
        after
          .filter((item) => known.has(item.id))
          .every((item) => item.is_read),
      ).toBe(true)
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "read is the only column a recipient can write",
    async () => {
      await signIn(SEEKER)
      const [item] = await fetchMyNotifications()
      expect(item).toBeTruthy()

      const { error } = await supabase
        .from("notifications")
        .update({ pushed_at: new Date().toISOString() })
        .eq("id", item.id)
      expect(error?.message).toContain("permission denied")
    },
    TEST_TIMEOUT_MS,
  )

  test(
    "only the triggers write notifications",
    async () => {
      await signIn(SEEKER)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      await signIn(SENDER)
      const { error } = await supabase.rpc("notify_user", {
        p_user: user.id,
        p_type: "event_closed",
      })
      expect(error?.message).toContain("permission denied")
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

describe("withdrawal notification", () => {
  let eventId = null

  beforeAll(async () => {
    eventId = await createEventAs(SEEKER, crypto.randomUUID())
  }, TEST_TIMEOUT_MS)

  afterAll(async () => {
    await signOut()
    if (eventId) await deleteOwnedEvent(eventId)
  })

  test(
    "withdrawing tells the event's owner who withdrew",
    async () => {
      await signIn(SENDER)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const apply = () =>
        supabase
          .from("applications")
          .insert({
            event_id: eventId,
            applicant_id: user.id,
            motivation: MOTIVATION,
          })
          .select("id")
          .single()
      const { data: withdrawn, error: applyError } = await apply()
      if (applyError) throw applyError
      const { error: withdrawError } = await supabase
        .from("applications")
        .delete()
        .eq("id", withdrawn.id)
      if (withdrawError) throw withdrawError
      const { error: reapplyError } = await apply()
      if (reapplyError) throw reapplyError

      await signIn(SEEKER)
      const items = await fetchMyNotifications()
      const row = items.find(
        (item) =>
          item.type === "application_withdrawn" && item.event_id === eventId,
      )
      expect(row).toBeTruthy()
      expect(row.application_id).toBeNull()
      expect(row.applicant_name).toBeTruthy()
    },
    TEST_TIMEOUT_MS,
  )
})
