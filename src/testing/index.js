// Shared setup for tests that hit the local Supabase with the public key.
// A feature test signs in as one of the seed accounts, creates what it needs,
// and deletes it afterwards. The service role is only used to remove what a
// test created: a signed-up account, or a check-email rate-limit row.

import { execFileSync } from "node:child_process"

import { createClient } from "@supabase/supabase-js"

import { supabase } from "../api/client.js"
import { createEvent, deleteEvent } from "../api/events.js"
import { DAY_MS } from "../constants/index.js"

const DEADLINE_IN_DAYS = 7

export const SENDER = { email: "sender@vaitu.local", password: "test1234" }
export const SEEKER = { email: "seeker@vaitu.local", password: "test1234" }

export async function signIn(account) {
  const { error } = await supabase.auth.signInWithPassword(account)
  if (error) throw error
}

export async function signOut() {
  // Files run in parallel and share the two seed accounts. The default scope
  // revokes every session of that account, including one another file is using.
  const { error } = await supabase.auth.signOut({ scope: "local" })
  if (error) throw error
}

export function pastDeadline() {
  return new Date(Date.now() - DAY_MS).toISOString()
}

export function eventPayload(id, deadline) {
  return {
    category: "wedding",
    title: `Vitest ${id}`,
    location: "Florence",
    country: "Italy",
    region: "Tuscany",
    event_date: "2027-06-01",
    application_deadline:
      deadline ??
      new Date(Date.now() + DEADLINE_IN_DAYS * DAY_MS).toISOString(),
    details: {
      style: "editorial",
      spouse_first_name_1: `Ada${id}`,
      spouse_first_name_2: `Ben${id}`,
    },
  }
}

export function coupleTitle(id) {
  return `Ada${id} & Ben${id}`
}

// The signed-in user only. A shared title must not match another account's row.
async function ownedEventId(title) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!user) throw new Error("Not logged in")
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("title", title)
    .eq("sender_id", user.id)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function createEventAs(account, id, deadline, fields) {
  await signIn(account)
  const payload = { ...eventPayload(id, deadline), ...fields }
  await createEvent(payload)
  const eventId = await ownedEventId(payload.title)
  if (!eventId) throw new Error("Created event was not found")
  return eventId
}

export async function deleteOwnedEvent(eventId) {
  await signIn(SEEKER)
  await deleteEvent(eventId)
}

export async function deleteOwnedEventByTitle(title) {
  await signIn(SEEKER)
  const eventId = await ownedEventId(title)
  if (!eventId) return
  await deleteEvent(eventId)
}

export async function deleteSignedUpUser(userId) {
  const { error } = await serviceRoleClient().auth.admin.deleteUser(userId)
  if (error) throw error
}

export async function deleteCheckEmailLimit(ipHash) {
  const { error } = await serviceRoleClient()
    .from("check_email_rate_limits")
    .delete()
    .eq("ip_hash", ipHash)
  if (error) throw error
}

export async function removeStoredFile(bucket, path) {
  const { error } = await serviceRoleClient()
    .storage.from(bucket)
    .remove([path])
  if (error) throw error
}

function serviceRoleClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    localServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

function localServiceRoleKey() {
  const output = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
  const [, quoted, bare] =
    output.match(/^SERVICE_ROLE_KEY=(?:"([^"]+)"|(\S+))$/m) ?? []
  const key = quoted ?? bare
  if (!key) throw new Error("supabase status did not return a service role key")
  return key
}
