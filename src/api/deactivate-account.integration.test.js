import { afterAll, expect, test } from "vitest"

import {
  ANTONY,
  coupleTitle,
  createEventAs,
  deleteSignedUpUser,
  eventPayload,
  GIADA,
  PASSWORD,
  signIn,
  signOut,
  signUp,
} from "../testing/index.js"
import { updateApplicationStatus } from "./applications.js"
import { supabase } from "./client.js"
import {
  createEvent,
  deleteEvent,
  fetchEventDetail,
  fetchMyEvents,
} from "./events.js"
import { uploadEventImage } from "./images.js"

const TEST_TIMEOUT_MS = 60000

let userId = null
let senderEventId = null

afterAll(async () => {
  try {
    if (senderEventId) {
      await signIn(GIADA)
      await deleteEvent(senderEventId)
    }
    if (userId) await deleteSignedUpUser(userId)
  } finally {
    await signOut()
  }
}, TEST_TIMEOUT_MS)

test(
  "a signed-out visitor cannot deactivate an account",
  async () => {
    await signOut()
    expect(await invoke("deactivate-account", {})).toEqual({
      status: 401,
      payload: { error: "Not logged in" },
    })
  },
  TEST_TIMEOUT_MS,
)

test(
  "the activity stamps are not the user's to write",
  async () => {
    await signIn(ANTONY)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: false, last_login_at: null })
      .eq("id", user.id)
    expect(error?.message).toContain("permission denied")

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single()
    expect(profile.is_active).toBe(true)
  },
  TEST_TIMEOUT_MS,
)

test(
  "deactivating deletes their open events and applications, but keeps the account and past wins",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    userId = await signUp({ email, fullName: `Vitest ${id}` })

    await signIn({ email, password: PASSWORD })
    await createEvent(eventPayload(id))
    const created = (await fetchMyEvents()).find(
      (event) => event.title === coupleTitle(id),
    )
    expect(created).toBeTruthy()

    const assignedId = crypto.randomUUID()
    await createEvent(eventPayload(assignedId))
    const assignedEvent = (await fetchMyEvents()).find(
      (event) => event.title === coupleTitle(assignedId),
    )
    expect(assignedEvent).toBeTruthy()

    const appliedId = crypto.randomUUID()
    senderEventId = await createEventAs(GIADA, appliedId)
    await signIn({ email, password: PASSWORD })

    await signIn(ANTONY)
    const {
      data: { user: applicant },
    } = await supabase.auth.getUser()
    const { error: applyError } = await supabase.from("applications").insert({
      event_id: assignedEvent.id,
      applicant_id: applicant.id,
      motivation: "Available the whole day",
    })
    expect(applyError).toBeNull()
    const { data: sentApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("event_id", assignedEvent.id)
      .single()
    expect(sentApplication).toBeTruthy()

    await signIn({ email, password: PASSWORD })
    await updateApplicationStatus(sentApplication.id, "shortlisted")
    const { error: assignError } = await supabase.rpc("assign_winner", {
      p_event_id: assignedEvent.id,
      p_application_id: sentApplication.id,
    })
    expect(assignError).toBeNull()
    const selectedEvent = (await fetchMyEvents()).find(
      (event) => event.title === coupleTitle(assignedId),
    )
    expect(selectedEvent?.status).toBe("assigned")

    await signIn(GIADA)
    const {
      data: { user: sender },
    } = await supabase.auth.getUser()
    await signIn({ email, password: PASSWORD })

    const result = await invoke("deactivate-account", { user_id: sender.id })
    expect(result).toEqual({ status: 200, payload: { deactivated: true } })

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active, deactivated_at")
      .eq("id", userId)
      .single()
    expect(profileError).toBeNull()
    expect(profile.is_active).toBe(false)
    expect(profile.deactivated_at).toBeTruthy()

    await signIn(ANTONY)
    const { data: orphaned, error: orphanedError } = await supabase
      .from("applications")
      .select("id")
      .eq("event_id", created.id)
    expect(orphanedError).toBeNull()
    expect(orphaned).toEqual([])

    const { data: kept } = await supabase
      .from("applications")
      .select("id, status, events(id)")
      .eq("event_id", assignedEvent.id)
      .single()
    expect(kept?.status).toBe("selected")
    expect(kept?.events?.id).toBe(assignedEvent.id)

    const detail = await fetchEventDetail(assignedEvent.id)
    expect(detail.senderName).toBe(`Vitest ${id}`)

    await signOut()

    await signIn(GIADA)
    const { data: publicEvent, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", created.id)
      .maybeSingle()
    expect(eventError).toBeNull()
    expect(publicEvent).toBeNull()

    const { data: received, error: receivedError } = await supabase
      .from("applications")
      .select("id")
      .eq("event_id", senderEventId)
    expect(receivedError).toBeNull()
    expect(received).toEqual([])

    await signIn({ email, password: PASSWORD })
    const { data: isReactivated, error: touchError } =
      await supabase.rpc("touch_login")
    expect(touchError).toBeNull()
    expect(isReactivated).toBe(true)

    const { data: isReactivatedAgain } = await supabase.rpc("touch_login")
    expect(isReactivatedAgain).toBe(false)

    const { data: restored } = await supabase
      .from("profiles")
      .select("is_active, deactivated_at, last_login_at")
      .eq("id", userId)
      .single()
    expect(restored.is_active).toBe(true)
    expect(restored.deactivated_at).toBeNull()
    expect(restored.last_login_at).toBeTruthy()

    const { data: visibleAgain } = await supabase
      .from("events")
      .select("id")
      .eq("id", created.id)
      .maybeSingle()
    expect(visibleAgain).toBeNull()

    const mine = (await fetchMyEvents()).find(
      (event) => event.title === coupleTitle(assignedId),
    )
    expect(mine?.status).toBe("assigned")

    const { count } = await supabase
      .from("applications")
      .select("id", { count: "exact" })
      .eq("applicant_id", userId)
    expect(count).toBe(0)

    await signIn(GIADA)
    await deleteEvent(senderEventId)
    senderEventId = null

    await deleteSignedUpUser(userId)
    userId = null
  },
  TEST_TIMEOUT_MS,
)

test(
  "deactivating takes down the images of the events it deletes",
  async () => {
    const id = crypto.randomUUID()
    const email = `vitest-${id}@vaitu.local`
    const imageOwnerId = await signUp({ email, fullName: `Vitest ${id}` })
    try {
      await signIn({ email, password: PASSWORD })
      const image = await uploadEventImage(
        new File([new Uint8Array([1])], "venue.png", { type: "image/png" }),
      )
      await createEvent({ ...eventPayload(id), image_urls: [image.url] })
      expect((await fetch(image.url)).ok).toBe(true)

      const result = await invoke("deactivate-account")
      expect(result.status).toBe(200)
      expect((await fetch(image.url)).ok).toBe(false)
    } finally {
      await deleteSignedUpUser(imageOwnerId)
    }
  },
  TEST_TIMEOUT_MS,
)

async function invoke(name, body) {
  const { data, response } = await supabase.functions.invoke(name, { body })
  const status = response?.status ?? 0
  const payload = status >= 400 && response ? await response.json() : data
  return { status, payload }
}
